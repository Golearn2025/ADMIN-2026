"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Plus, ChevronLeft, Calendar, ClipboardList, Copy, Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import type {
  MarketCheck, MarketCompetitor, MarketRouteTemplate, MarketScenario,
  MarketCheckPrice, VehicleCategory,
} from "@/lib/market-pricing/types";
import {
  formatGbp, gbpToPence, penceToGbp,
  VEHICLE_CATEGORY_LABELS, TRIP_TYPE_LABELS, BAND_LABELS,
} from "@/lib/market-pricing/format";
import {
  computeStats, computeGaps, computeRecommendations, computePosition, POSITION_CONFIG,
} from "@/lib/market-pricing/formulas";

// ── Types ──────────────────────────────────────────────────────────────────────

interface PriceEntry {
  scenario_id: string;
  price_role: "vl_actual" | "vl_target" | "competitor";
  competitor_id?: string;
  amount_pence: number;
  extra_hours?: number;
}

interface LoadedCheck {
  check: MarketCheck;
  prices: Array<MarketCheckPrice & { competitor?: MarketCompetitor; scenario?: MarketScenario & { route_template?: MarketRouteTemplate } }>;
}

// ── Price input cell ──────────────────────────────────────────────────────────

function PriceCell({
  value,
  onSave,
  onNext,
  placeholder,
  isSaving,
}: {
  value: number | null;
  onSave: (pence: number | null) => void;
  onNext?: () => void;
  placeholder?: string;
  isSaving?: boolean;
}) {
  const [raw, setRaw] = useState(value != null ? penceToGbp(value) : "");
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setRaw(value != null ? penceToGbp(value) : "");
  }, [value]);

  function commit() {
    if (!raw.trim()) { onSave(null); return; }
    const pence = gbpToPence(raw);
    if (pence != null) onSave(pence);
    else setRaw(value != null ? penceToGbp(value) : "");
  }

  return (
    <div className="relative flex items-center">
      <span className="absolute left-2.5 text-xs text-muted-foreground pointer-events-none">£</span>
      <Input
        ref={ref}
        value={raw}
        onChange={e => setRaw(e.target.value)}
        onBlur={commit}
        onKeyDown={e => {
          if (e.key === "Enter") { e.preventDefault(); commit(); onNext?.(); }
          if (e.key === "Escape") { setRaw(value != null ? penceToGbp(value) : ""); ref.current?.blur(); }
        }}
        placeholder={placeholder ?? "0.00"}
        className="pl-6 h-8 text-sm tabular-nums w-28"
      />
      {isSaving && <Loader2 className="absolute right-2 h-3 w-3 animate-spin text-muted-foreground" />}
    </div>
  );
}

// ── New check creation form ───────────────────────────────────────────────────

function NewCheckForm({ onCreated }: { onCreated: (check: MarketCheck) => void }) {
  const now = new Date();
  const localISO = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  const [label, setLabel] = useState("");
  const [qdt, setQdt] = useState(localISO);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function create() {
    if (!qdt) { setError("Select a quote date & time."); return; }
    setSaving(true); setError(null);
    const res = await fetch("/api/admin/market-pricing/checks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label: label.trim() || null, quote_datetime: new Date(qdt).toISOString() }),
    });
    const json = await res.json();
    setSaving(false);
    if (!res.ok) { setError(json.error ?? "Failed to create"); return; }
    onCreated(json.check);
  }

  return (
    <div className="max-w-2xl mx-auto py-16 px-8 text-center space-y-6">
      <div className="flex flex-col items-center gap-2 mb-2">
        <ClipboardList className="h-10 w-10 text-primary/60" />
        <h2 className="text-xl font-semibold text-foreground">New Weekly Check</h2>
        <p className="text-sm text-muted-foreground">Set the quote date & time — the exact moment you checked prices on competitor websites.</p>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
      <div className="rounded-xl border border-border bg-card p-5 space-y-3 text-left">
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Quote date & time *</label>
          <Input
            type="datetime-local"
            value={qdt}
            onChange={e => setQdt(e.target.value)}
            className="text-sm"
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Label (optional — e.g. "Week 24 summer test")</label>
          <Input
            placeholder="Leave blank to auto-label"
            value={label}
            onChange={e => setLabel(e.target.value)}
            onKeyDown={e => e.key === "Enter" && create()}
          />
        </div>
        <Button className="w-full" onClick={create} disabled={saving}>
          {saving ? "Creating…" : "Start check →"}
        </Button>
      </div>
    </div>
  );
}

// ── Check grid ────────────────────────────────────────────────────────────────

function CheckGrid({ checkId, competitors }: { checkId: string; competitors: MarketCompetitor[] }) {
  const [data, setData] = useState<LoadedCheck | null>(null);
  const [routes, setRoutes] = useState<MarketRouteTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [filterCat, setFilterCat] = useState<VehicleCategory | "all">("all");

  const load = useCallback(async () => {
    setLoading(true);
    const [checkRes, routesRes] = await Promise.all([
      fetch(`/api/admin/market-pricing/checks/${checkId}/prices`),
      fetch("/api/admin/market-pricing/routes"),
    ]);
    const checkJson = await checkRes.json();
    const routesJson = await routesRes.json();
    setData(checkJson);
    setRoutes(routesJson.routes ?? []);
    setLoading(false);
  }, [checkId]);

  useEffect(() => { load(); }, [load]);

  // Build price map: scenario_id -> role -> competitor_id? -> pence
  const priceMap = new Map<string, number | null>();
  if (data) {
    for (const p of data.prices) {
      const key = p.price_role === "competitor"
        ? `${p.scenario_id}::${p.price_role}::${p.competitor_id}`
        : `${p.scenario_id}::${p.price_role}`;
      priceMap.set(key, p.amount_pence);
    }
  }

  function getPrice(scenarioId: string, role: "vl_actual" | "vl_target"): number | null {
    return priceMap.get(`${scenarioId}::${role}`) ?? null;
  }

  async function savePrice(scenarioId: string, role: "vl_actual" | "vl_target" | "competitor", competitorId: string | undefined, pence: number | null) {
    if (pence == null) return;
    const key = role === "competitor" ? `${scenarioId}::${role}::${competitorId}` : `${scenarioId}::${role}`;
    setSaving(s => ({ ...s, [key]: true }));
    await fetch(`/api/admin/market-pricing/checks/${checkId}/prices`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scenario_id: scenarioId, price_role: role, competitor_id: competitorId ?? null, amount_pence: pence }),
    });
    setSaving(s => ({ ...s, [key]: false }));
    // Optimistically update local map without full reload
    setData(d => {
      if (!d) return d;
      const existing = d.prices.findIndex(p =>
        p.scenario_id === scenarioId &&
        p.price_role === role &&
        (role !== "competitor" || p.competitor_id === (competitorId ?? null))
      );
      const newPrices = [...d.prices];
      if (existing >= 0) {
        newPrices[existing] = { ...newPrices[existing], amount_pence: pence };
      } else {
        newPrices.push({
          id: Math.random().toString(36),
          check_id: checkId,
          scenario_id: scenarioId,
          price_role: role,
          competitor_id: competitorId ?? null,
          amount_pence: pence,
          extra_hours: null,
          notes: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }
      return { ...d, prices: newPrices };
    });
  }

  if (loading) return <div className="p-8 space-y-2">{[...Array(6)].map((_, i) => <div key={i} className="h-12 rounded-xl bg-card animate-pulse" />)}</div>;
  if (!data) return <div className="p-8 text-sm text-muted-foreground">Failed to load check data.</div>;

  // All scenarios from all routes
  const allScenarios = routes.flatMap(r =>
    (r.scenarios ?? []).filter(s =>
      s.is_active && (filterCat === "all" || s.vehicle_category_id === filterCat)
    ).map(s => ({ ...s, route_template: r }))
  );

  const cats: Array<VehicleCategory | "all"> = ["all", "executive", "luxury", "suv", "mpv"];

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="text-base font-semibold text-foreground">
            {data.check.label ?? new Date(data.check.quote_datetime).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Quote time: {new Date(data.check.quote_datetime).toLocaleString("en-GB", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "short" })}
            · {allScenarios.length} scenario{allScenarios.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {cats.map(c => (
            <button
              key={c}
              onClick={() => setFilterCat(c)}
              className={`px-3 py-1 rounded-lg text-xs font-medium border transition-colors ${
                filterCat === c
                  ? "border-primary bg-primary/15 text-primary"
                  : "border-border bg-card text-muted-foreground hover:text-foreground"
              }`}
            >
              {c === "all" ? "All" : VEHICLE_CATEGORY_LABELS[c]}
            </button>
          ))}
        </div>
      </div>

      {allScenarios.length === 0 ? (
        <div className="py-12 text-center text-sm text-muted-foreground">
          No routes / scenarios found. Go to the <strong>Routes</strong> tab and add some route templates first.
        </div>
      ) : (
        <div className="space-y-3">
          {allScenarios.map((scenario, si) => {
            const route = scenario.route_template!;
            const vlPence = getPrice(scenario.id, "vl_actual");
            const targetPence = getPrice(scenario.id, "vl_target");
            const compPrices = competitors.map(comp => ({
              competitor: comp,
              amount_pence: priceMap.get(`${scenario.id}::competitor::${comp.id}`) ?? null,
            })).filter(c => c.amount_pence != null) as Array<{ competitor: MarketCompetitor; amount_pence: number }>;

            const stats = computeStats(compPrices.map(c => c.amount_pence));
            const gaps = computeGaps(vlPence, compPrices);
            const recs = computeRecommendations(stats);
            const position = computePosition(vlPence, stats.min_pence);
            const posConfig = position ? POSITION_CONFIG[position] : null;

            const cells = ["vl_actual", ...competitors.map(c => `comp::${c.id}`), "vl_target"];
            const totalCells = cells.length;

            return (
              <div key={scenario.id} className="rounded-xl border border-border bg-card overflow-hidden">
                {/* Scenario header */}
                <div className="flex items-center gap-3 px-4 py-2.5 bg-card border-b border-border/60">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="text-xs font-semibold text-foreground truncate">{route.name}</span>
                    <span className="text-xs px-1.5 py-0.5 rounded bg-primary/10 text-primary shrink-0">
                      {VEHICLE_CATEGORY_LABELS[scenario.vehicle_category_id]}
                    </span>
                    {route.trip_type && (
                      <span className="text-xs text-muted-foreground shrink-0">{TRIP_TYPE_LABELS[route.trip_type]}</span>
                    )}
                    {route.distance_miles && <span className="text-xs text-muted-foreground shrink-0">{route.distance_miles} mi</span>}
                    {route.duration_minutes && <span className="text-xs text-muted-foreground shrink-0">{route.duration_minutes} min</span>}
                  </div>
                  {posConfig && (
                    <Badge variant={posConfig.badge as any} className="text-xs shrink-0">
                      {posConfig.label}
                    </Badge>
                  )}
                </div>

                {/* Price inputs */}
                <div className="px-4 py-3 overflow-x-auto">
                  <div className="flex gap-4 min-w-max">
                    {/* VL Actual */}
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-primary whitespace-nowrap">Vantage Lane</span>
                      <PriceCell
                        value={vlPence}
                        isSaving={saving[`${scenario.id}::vl_actual`]}
                        onSave={p => savePrice(scenario.id, "vl_actual", undefined, p)}
                        onNext={() => {
                          const nextEl = document.querySelector<HTMLInputElement>(`[data-cell="${scenario.id}::comp::${competitors[0]?.id}"]`);
                          nextEl?.focus();
                        }}
                      />
                    </div>

                    {/* Competitors */}
                    {competitors.map((comp, ci) => {
                      const compPence = priceMap.get(`${scenario.id}::competitor::${comp.id}`) ?? null;
                      const gap = gaps.find(g => g.competitor.id === comp.id);
                      return (
                        <div key={comp.id} className="flex flex-col gap-1">
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] font-medium text-muted-foreground whitespace-nowrap truncate max-w-[90px]" title={comp.name}>
                              {comp.name}
                            </span>
                            <a
                              href={`https://${comp.website_url}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-muted-foreground/50 hover:text-primary"
                              title={`Open ${comp.website_url}`}
                            >
                              <svg className="h-2.5 w-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                            </a>
                          </div>
                          <PriceCell
                            value={compPence}
                            isSaving={saving[`${scenario.id}::competitor::${comp.id}`]}
                            onSave={p => savePrice(scenario.id, "competitor", comp.id, p)}
                            onNext={() => {
                              const nextId = ci < competitors.length - 1
                                ? `${scenario.id}::comp::${competitors[ci + 1].id}`
                                : `${scenario.id}::vl_target`;
                              document.querySelector<HTMLInputElement>(`[data-cell="${nextId}"]`)?.focus();
                            }}
                          />
                          {gap && (
                            <span className={`text-[10px] tabular-nums ${gap.delta_pence > 0 ? "text-red-400" : gap.delta_pence < 0 ? "text-green-400" : "text-muted-foreground"}`}>
                              {gap.delta_pence > 0 ? "▲" : gap.delta_pence < 0 ? "▼" : "="} {gap.label}
                            </span>
                          )}
                        </div>
                      );
                    })}

                    {/* Target */}
                    <div className="flex flex-col gap-1 border-l border-border/60 pl-4">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-400 whitespace-nowrap">My Target</span>
                      <PriceCell
                        value={targetPence}
                        isSaving={saving[`${scenario.id}::vl_target`]}
                        onSave={p => savePrice(scenario.id, "vl_target", undefined, p)}
                        placeholder="Target"
                      />
                    </div>
                  </div>
                </div>

                {/* Stats row */}
                {(stats.min_pence != null || recs.aggressive_pence != null) && (
                  <div className="px-4 py-2 bg-muted/20 border-t border-border/40 flex gap-4 flex-wrap text-xs text-muted-foreground">
                    {stats.min_pence != null && <span>Min: <strong className="text-foreground">{formatGbp(stats.min_pence)}</strong></span>}
                    {stats.median_pence != null && <span>Median: <strong className="text-foreground">{formatGbp(stats.median_pence)}</strong></span>}
                    {stats.max_pence != null && <span>Max: <strong className="text-foreground">{formatGbp(stats.max_pence)}</strong></span>}
                    {recs.aggressive_pence != null && (
                      <span className="ml-auto text-green-400">
                        Aggressive (−5%): <strong>{formatGbp(recs.aggressive_pence)}</strong>
                      </span>
                    )}
                    {recs.match_min_pence != null && (
                      <span className="text-blue-400">
                        Match min: <strong>{formatGbp(recs.match_min_pence)}</strong>
                      </span>
                    )}
                    {recs.premium_pence != null && (
                      <span className="text-amber-400">
                        Premium (+10%): <strong>{formatGbp(recs.premium_pence)}</strong>
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Main tab ──────────────────────────────────────────────────────────────────

export function ChecksTab() {
  const [checks, setChecks] = useState<MarketCheck[]>([]);
  const [competitors, setCompetitors] = useState<MarketCompetitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"list" | "new" | "grid">("list");
  const [activeCheckId, setActiveCheckId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [checksRes, compsRes] = await Promise.all([
      fetch("/api/admin/market-pricing/checks"),
      fetch("/api/admin/market-pricing/competitors"),
    ]);
    const checksJson = await checksRes.json();
    const compsJson = await compsRes.json();
    setChecks(checksJson.checks ?? []);
    setCompetitors(compsJson.competitors ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  function openCheck(id: string) {
    setActiveCheckId(id);
    setView("grid");
  }

  function handleCreated(check: MarketCheck) {
    setChecks(prev => [check, ...prev]);
    openCheck(check.id);
  }

  if (view === "new") {
    return (
      <div>
        <div className="px-8 pt-4">
          <Button variant="ghost" size="sm" onClick={() => setView("list")}>
            <ChevronLeft className="h-4 w-4 mr-1" /> Back
          </Button>
        </div>
        <NewCheckForm onCreated={handleCreated} />
      </div>
    );
  }

  if (view === "grid" && activeCheckId) {
    return (
      <div>
        <div className="px-6 pt-4">
          <Button variant="ghost" size="sm" onClick={() => setView("list")}>
            <ChevronLeft className="h-4 w-4 mr-1" /> All checks
          </Button>
        </div>
        <CheckGrid checkId={activeCheckId} competitors={competitors} />
      </div>
    );
  }

  // List view
  return (
    <div className="p-8 max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Weekly Checks</h2>
          <p className="text-sm text-muted-foreground mt-0.5">{checks.length} check{checks.length !== 1 ? "s" : ""} in history</p>
        </div>
        <Button size="sm" onClick={() => setView("new")}>
          <Plus className="h-4 w-4 mr-1.5" />
          New check
        </Button>
      </div>

      {loading ? (
        <div className="space-y-2">{[...Array(5)].map((_, i) => <div key={i} className="h-16 rounded-xl bg-card animate-pulse" />)}</div>
      ) : checks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <ClipboardList className="h-10 w-10 text-muted-foreground/40 mb-3" />
          <p className="text-sm font-medium text-foreground">No checks yet</p>
          <p className="text-xs text-muted-foreground mt-1">Click "New check" to start your first weekly price check.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {checks.map(c => (
            <button
              key={c.id}
              onClick={() => openCheck(c.id)}
              className="w-full group flex items-center gap-4 rounded-xl border border-border bg-card px-4 py-3 hover:border-primary/40 hover:bg-primary/5 transition-colors text-left"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                <Calendar className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {c.label ?? new Date(c.quote_datetime).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Quote: {new Date(c.quote_datetime).toLocaleString("en-GB", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "short" })}
                </p>
              </div>
              <span className="text-xs text-muted-foreground group-hover:text-primary transition-colors shrink-0">Open →</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
