"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Plane, Clock, Route as RouteIcon, Plus, Pencil, Trash2, X, Check, Copy, ArrowLeftRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { MarketRouteTemplate, TripType, VehicleCategory } from "@/lib/market-pricing/types";
import { TRIP_TYPE_LABELS, VEHICLE_CATEGORY_LABELS, BAND_LABELS } from "@/lib/market-pricing/format";

const ALL_CATEGORIES: VehicleCategory[] = ["executive", "luxury", "mpv", "suv"];
const TRIP_TYPES: TripType[] = ["airport_pickup", "airport_dropoff", "distance", "hourly", "daily"];

// Context-aware labels per trip type
const FIELD_LABELS: Record<TripType, { pickup: string; dropoff: string; pickupHint: string; dropoffHint: string }> = {
  airport_pickup: {
    pickup: "Airport address",
    dropoff: "Client destination",
    pickupHint: "e.g. Heathrow Terminal 2, Inner Ring E, TW6 1EW",
    dropoffHint: "e.g. 221B Baker Street, London NW1 6XE",
  },
  airport_dropoff: {
    pickup: "Client origin",
    dropoff: "Airport address",
    pickupHint: "e.g. 221B Baker Street, London NW1 6XE",
    dropoffHint: "e.g. Heathrow Terminal 2, Inner Ring E, TW6 1EW",
  },
  distance: {
    pickup: "From (pickup)",
    dropoff: "To (dropoff)",
    pickupHint: "e.g. Mayfair, London W1K",
    dropoffHint: "e.g. Canary Wharf, London E14",
  },
  hourly: { pickup: "Area / Zone", dropoff: "", pickupHint: "e.g. Central London (optional)", dropoffHint: "" },
  daily: { pickup: "Area / Zone", dropoff: "", pickupHint: "e.g. London & surroundings (optional)", dropoffHint: "" },
};

interface RouteForm {
  id: string | null;
  name: string;
  trip_type: TripType;
  pickup_label: string;
  dropoff_label: string;
  airport_code: string;
  distance_miles: string;
  duration_minutes: string;
  hourly_billed_hours: string;
  daily_included_hours: string;
  daily_days: string;
  distance_band: string;
  categories: VehicleCategory[];
}

function blankForm(): RouteForm {
  return {
    id: null, name: "", trip_type: "airport_pickup",
    pickup_label: "", dropoff_label: "", airport_code: "",
    distance_miles: "", duration_minutes: "", hourly_billed_hours: "",
    daily_included_hours: "", daily_days: "1", distance_band: "",
    categories: ["executive", "luxury", "mpv", "suv"],
  };
}

function routeToForm(r: MarketRouteTemplate): RouteForm {
  return {
    id: r.id, name: r.name, trip_type: r.trip_type,
    pickup_label: r.pickup_label ?? "", dropoff_label: r.dropoff_label ?? "",
    airport_code: r.airport_code ?? "",
    distance_miles: r.distance_miles?.toString() ?? "",
    duration_minutes: r.duration_minutes?.toString() ?? "",
    hourly_billed_hours: r.hourly_billed_hours?.toString() ?? "",
    daily_included_hours: r.daily_included_hours?.toString() ?? "",
    daily_days: r.daily_days?.toString() ?? "1",
    distance_band: r.distance_band ?? "",
    categories: (r.scenarios ?? [])
      .sort((a, b) => {
        const o: Record<string, number> = { executive: 0, luxury: 1, mpv: 2, suv: 3 };
        return (o[a.vehicle_category_id] ?? 9) - (o[b.vehicle_category_id] ?? 9);
      })
      .map(s => s.vehicle_category_id),
  };
}

function tripIcon(type: TripType) {
  if (type === "airport_pickup" || type === "airport_dropoff") return <Plane className="h-4 w-4" />;
  if (type === "hourly" || type === "daily") return <Clock className="h-4 w-4" />;
  return <RouteIcon className="h-4 w-4" />;
}

// Auto-generate route name from pickup/dropoff/type
function autoName(form: RouteForm): string {
  const { trip_type, pickup_label, dropoff_label, hourly_billed_hours, daily_days, distance_band } = form;
  const short = (s: string) => s.split(",")[0].trim();
  if (trip_type === "hourly") return `Hourly ${hourly_billed_hours || "?"}h`;
  if (trip_type === "daily") return `Daily ${daily_days || 1} day${parseInt(daily_days || "1") > 1 ? "s" : ""}`;
  if (trip_type === "distance" && distance_band) return `Distance ${BAND_LABELS[distance_band] || ""} · ${short(pickup_label || "?")} → ${short(dropoff_label || "?")}`;
  if (pickup_label && dropoff_label) return `${short(pickup_label)} → ${short(dropoff_label)}`;
  return "";
}

// ── Field row with label ──────────────────────────────────────────────────────
function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold text-foreground uppercase tracking-wide">{label}</label>
      {children}
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

// ── Copy button ───────────────────────────────────────────────────────────────
function CopyBtn({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }
  return (
    <button
      type="button"
      onClick={copy}
      title="Copy"
      className="shrink-0 flex items-center justify-center h-9 w-9 rounded-lg border border-border bg-card hover:bg-muted transition-colors"
    >
      {copied
        ? <Check className="h-3.5 w-3.5 text-green-400" />
        : <Copy className="h-3.5 w-3.5 text-muted-foreground" />}
    </button>
  );
}

export function RoutesTab() {
  const [routes, setRoutes] = useState<MarketRouteTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<RouteForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const firstFieldRef = useRef<HTMLInputElement>(null);
  const prevFormNull = useRef(true);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/market-pricing/routes");
    const json = await res.json();
    setRoutes(json.routes ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const isOpen = form !== null;
    if (isOpen && prevFormNull.current) setTimeout(() => firstFieldRef.current?.focus(), 50);
    prevFormNull.current = !isOpen;
  }, [form !== null]); // eslint-disable-line react-hooks/exhaustive-deps

  function set(field: keyof RouteForm, value: string | VehicleCategory[]) {
    setForm(f => {
      if (!f) return f;
      const updated = { ...f, [field]: value };
      // Auto-fill name if user hasn't typed a custom one
      if (field !== "name") {
        const auto = autoName(updated);
        if (auto && (!f.name || f.name === autoName(f))) updated.name = auto;
      }
      return updated;
    });
  }

  function toggleCat(cat: VehicleCategory) {
    setForm(f => {
      if (!f) return f;
      const cats = f.categories.includes(cat)
        ? f.categories.filter(c => c !== cat)
        : [...f.categories, cat];
      return { ...f, categories: cats };
    });
  }

  function swapAddresses() {
    setForm(f => f ? { ...f, pickup_label: f.dropoff_label, dropoff_label: f.pickup_label } : f);
  }

  async function save() {
    if (!form) return;
    if (form.categories.length === 0) { setError("Select at least one vehicle category."); return; }
    if (!form.pickup_label.trim() && (form.trip_type === "airport_pickup" || form.trip_type === "airport_dropoff" || form.trip_type === "distance")) {
      setError("Enter the pickup address."); return;
    }
    setSaving(true);
    setError(null);
    try {
      const name = form.name.trim() || autoName(form) || "Route";
      const payload = {
        id: form.id ?? undefined,
        name,
        trip_type: form.trip_type,
        pickup_label: form.pickup_label.trim() || null,
        dropoff_label: form.dropoff_label.trim() || null,
        airport_code: form.airport_code.trim() || null,
        distance_miles: form.distance_miles ? parseFloat(form.distance_miles) : null,
        duration_minutes: form.duration_minutes ? parseInt(form.duration_minutes) : null,
        hourly_billed_hours: form.hourly_billed_hours ? parseFloat(form.hourly_billed_hours) : null,
        daily_included_hours: form.daily_included_hours ? parseFloat(form.daily_included_hours) : null,
        daily_days: form.daily_days ? parseInt(form.daily_days) : 1,
        distance_band: form.distance_band || null,
        categories: form.categories,
      };
      const res = await fetch("/api/admin/market-pricing/routes", {
        method: form.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? "Failed to save"); return; }
      await load();
      setForm(null);
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this route?")) return;
    await fetch(`/api/admin/market-pricing/routes?id=${id}`, { method: "DELETE" });
    await load();
  }

  const isAirport = (t?: TripType) => t === "airport_pickup" || t === "airport_dropoff";
  const isHourly = (t?: TripType) => t === "hourly";
  const isDaily = (t?: TripType) => t === "daily";
  const isDistance = (t?: TripType) => t === "distance";

  const groupedByType = TRIP_TYPES.reduce<Record<TripType, MarketRouteTemplate[]>>((acc, type) => {
    acc[type] = routes.filter(r => r.trip_type === type);
    return acc;
  }, {} as Record<TripType, MarketRouteTemplate[]>);

  const labels = form ? FIELD_LABELS[form.trip_type] : FIELD_LABELS.airport_pickup;

  return (
    <div className="p-8 max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Route Templates</h2>
          <p className="text-sm text-muted-foreground mt-0.5">{routes.length} route{routes.length !== 1 ? "s" : ""} · reused across all weekly checks</p>
        </div>
        <Button size="sm" onClick={() => { setForm(blankForm()); setError(null); }}>
          <Plus className="h-4 w-4 mr-1.5" />
          Add route
        </Button>
      </div>

      {/* ── FORM ── */}
      {form !== null && (
        <div className="rounded-xl border border-primary/30 bg-card p-5 space-y-5">
          {/* Form header */}
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-foreground">{form.id ? "Edit route" : "New route"}</p>
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => { setForm(null); setError(null); }}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          {error && <p className="text-xs text-destructive bg-destructive/10 rounded-lg px-3 py-2">{error}</p>}

          {/* Step 1 — Trip type */}
          <Field label="1 · Trip type">
            <div className="flex gap-2 flex-wrap">
              {TRIP_TYPES.map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => set("trip_type", t)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                    form.trip_type === t
                      ? "border-primary bg-primary/15 text-primary"
                      : "border-border bg-card text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tripIcon(t)}
                  {TRIP_TYPE_LABELS[t]}
                </button>
              ))}
            </div>
          </Field>

          {/* Step 2 — Addresses */}
          {(isAirport(form.trip_type) || isDistance(form.trip_type)) && (
            <div className="space-y-3 rounded-lg border border-border/60 bg-muted/20 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-foreground">2 · Addresses</p>
              <p className="text-xs text-muted-foreground -mt-2">
                {form.trip_type === "airport_pickup" && "Passenger comes FROM the airport TO destination."}
                {form.trip_type === "airport_dropoff" && "Passenger goes FROM their location TO the airport."}
                {form.trip_type === "distance" && "Point-to-point transfer."}
              </p>

              {/* Pickup */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-green-500/20 text-green-400 text-[10px] font-bold">A</span>
                  {labels.pickup}
                </label>
                <div className="flex gap-2">
                  <Input
                    ref={firstFieldRef}
                    placeholder={labels.pickupHint}
                    value={form.pickup_label}
                    onChange={e => set("pickup_label", e.target.value)}
                    className="flex-1"
                  />
                  <CopyBtn value={form.pickup_label} />
                </div>
              </div>

              {/* Swap */}
              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={swapAddresses}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  title="Swap pickup ↔ dropoff"
                >
                  <ArrowLeftRight className="h-3.5 w-3.5" />
                  Swap
                </button>
              </div>

              {/* Dropoff */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-red-500/20 text-red-400 text-[10px] font-bold">B</span>
                  {labels.dropoff}
                </label>
                <div className="flex gap-2">
                  <Input
                    placeholder={labels.dropoffHint}
                    value={form.dropoff_label}
                    onChange={e => set("dropoff_label", e.target.value)}
                    className="flex-1"
                  />
                  <CopyBtn value={form.dropoff_label} />
                </div>
              </div>
            </div>
          )}

          {/* Step 2 — Hourly/Daily specifics */}
          {isHourly(form.trip_type) && (
            <div className="space-y-3 rounded-lg border border-border/60 bg-muted/20 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-foreground">2 · Hourly details</p>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Hours billed" hint="Total hours the client pays for">
                  <Input
                    ref={firstFieldRef}
                    type="number" min="1" step="0.5"
                    placeholder="e.g. 4"
                    value={form.hourly_billed_hours}
                    onChange={e => set("hourly_billed_hours", e.target.value)}
                  />
                </Field>
                <Field label="Zone / Area (optional)">
                  <Input
                    placeholder="e.g. Central London"
                    value={form.pickup_label}
                    onChange={e => set("pickup_label", e.target.value)}
                  />
                </Field>
              </div>
            </div>
          )}

          {isDaily(form.trip_type) && (
            <div className="space-y-3 rounded-lg border border-border/60 bg-muted/20 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-foreground">2 · Daily details</p>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Number of days">
                  <Input
                    ref={firstFieldRef}
                    type="number" min="1"
                    placeholder="1"
                    value={form.daily_days}
                    onChange={e => set("daily_days", e.target.value)}
                  />
                </Field>
                <Field label="Hours included per day" hint="What's included in the daily rate">
                  <Input
                    type="number" min="1" step="0.5"
                    placeholder="e.g. 10"
                    value={form.daily_included_hours}
                    onChange={e => set("daily_included_hours", e.target.value)}
                  />
                </Field>
              </div>
            </div>
          )}

          {/* Step 3 — Distance & Duration */}
          {(isAirport(form.trip_type) || isDistance(form.trip_type)) && (
            <div className="space-y-3 rounded-lg border border-border/60 bg-muted/20 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-foreground">3 · Distance &amp; duration</p>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Miles" hint="Total distance of this route">
                  <Input
                    type="number" min="0" step="0.1"
                    placeholder="e.g. 17.1"
                    value={form.distance_miles}
                    onChange={e => set("distance_miles", e.target.value)}
                  />
                </Field>
                <Field label="Minutes" hint="Estimated journey time">
                  <Input
                    type="number" min="0"
                    placeholder="e.g. 60"
                    value={form.duration_minutes}
                    onChange={e => set("duration_minutes", e.target.value)}
                  />
                </Field>
              </div>
              {isAirport(form.trip_type) && (
                <Field label="Airport code (optional)" hint="LHR, LGW, STN, LTN…">
                  <Input
                    placeholder="LHR"
                    value={form.airport_code}
                    onChange={e => set("airport_code", e.target.value.toUpperCase())}
                    className="w-28"
                  />
                </Field>
              )}
              {isDistance(form.trip_type) && (
                <Field label="Distance band (optional)" hint="Short / Medium / Long / Very Long">
                  <Select value={form.distance_band} onValueChange={v => set("distance_band", v)}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Select band…" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(BAND_LABELS).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              )}
            </div>
          )}

          {/* Step 4 — Vehicle categories */}
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-foreground">
              {isAirport(form.trip_type) || isDistance(form.trip_type) ? "4" : "3"} · Vehicle categories
            </p>
            <p className="text-xs text-muted-foreground">Which car types do you want to compare on this route?</p>
            <div className="flex gap-2 flex-wrap">
              {ALL_CATEGORIES.map(cat => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => toggleCat(cat)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                    form.categories.includes(cat)
                      ? "border-primary bg-primary/15 text-primary"
                      : "border-border bg-card text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {VEHICLE_CATEGORY_LABELS[cat]}
                </button>
              ))}
            </div>
          </div>

          {/* Step 5 — Route name (auto-generated, editable) */}
          <Field
            label={`${isAirport(form.trip_type) || isDistance(form.trip_type) ? "5" : "4"} · Route name`}
            hint="Auto-generated from addresses — edit if you want a shorter label"
          >
            <Input
              placeholder="e.g. LHR T2 → Mayfair"
              value={form.name}
              onChange={e => set("name", e.target.value)}
            />
          </Field>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-1 border-t border-border/40">
            <Button variant="outline" size="sm" onClick={() => { setForm(null); setError(null); }}>Cancel</Button>
            <Button size="sm" onClick={save} disabled={saving}>
              <Check className="h-4 w-4 mr-1" />
              {saving ? "Saving…" : "Save route"}
            </Button>
          </div>
        </div>
      )}

      {/* ── ROUTE LIST ── */}
      {loading ? (
        <div className="space-y-2">{[...Array(5)].map((_, i) => <div key={i} className="h-14 rounded-xl bg-card animate-pulse" />)}</div>
      ) : routes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <RouteIcon className="h-10 w-10 text-muted-foreground/40 mb-3" />
          <p className="text-sm font-medium text-foreground">No routes yet</p>
          <p className="text-xs text-muted-foreground mt-1">Click "Add route" above to create your first route template.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {TRIP_TYPES.filter(t => groupedByType[t].length > 0).map(type => (
            <div key={type}>
              <div className="flex items-center gap-2 mb-2">
                {tripIcon(type)}
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{TRIP_TYPE_LABELS[type]}</span>
                <span className="text-xs text-muted-foreground">({groupedByType[type].length})</span>
              </div>
              <div className="space-y-1.5">
                {groupedByType[type].map(r => (
                  <div
                    key={r.id}
                    className="group flex items-center gap-4 rounded-xl border border-border bg-card px-4 py-3 hover:border-border/80 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-foreground">{r.name}</span>
                        {r.distance_miles && <span className="text-xs text-muted-foreground">{r.distance_miles} mi</span>}
                        {r.duration_minutes && <span className="text-xs text-muted-foreground">{r.duration_minutes} min</span>}
                        {r.hourly_billed_hours && <span className="text-xs text-muted-foreground">{r.hourly_billed_hours}h billed</span>}
                        {r.daily_days && r.daily_included_hours && (
                          <span className="text-xs text-muted-foreground">{r.daily_days} day · {r.daily_included_hours}h incl.</span>
                        )}
                        {r.airport_code && <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">{r.airport_code}</Badge>}
                        {r.distance_band && <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">{BAND_LABELS[r.distance_band]}</Badge>}
                      </div>
                      {(r.pickup_label || r.dropoff_label) && (
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">
                          <span className="text-green-400 font-medium">A</span> {r.pickup_label}
                          {r.pickup_label && r.dropoff_label && " → "}
                          <span className="text-red-400 font-medium">B</span> {r.dropoff_label}
                        </p>
                      )}
                      <div className="flex gap-1 mt-1.5 flex-wrap">
                        {[...(r.scenarios ?? [])]
                          .sort((a, b) => {
                            const o: Record<string, number> = { executive: 0, luxury: 1, mpv: 2, suv: 3 };
                            return (o[a.vehicle_category_id] ?? 9) - (o[b.vehicle_category_id] ?? 9);
                          })
                          .map(s => (
                            <span key={s.id} className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                              {VEHICLE_CATEGORY_LABELS[s.vehicle_category_id]}
                            </span>
                          ))}
                      </div>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => { setForm(routeToForm(r)); setError(null); }}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive hover:text-destructive" onClick={() => remove(r.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
