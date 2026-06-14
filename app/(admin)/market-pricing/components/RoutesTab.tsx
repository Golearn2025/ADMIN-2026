"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Plane, Clock, Route as RouteIcon, ChevronDown, ChevronUp,
  Plus, Pencil, Trash2, X, Check, Copy, ArrowLeftRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import type { MarketRouteTemplate, TripType, VehicleCategory } from "@/lib/market-pricing/types";
import { TRIP_TYPE_LABELS, VEHICLE_CATEGORY_LABELS, BAND_LABELS } from "@/lib/market-pricing/format";

const ALL_CATEGORIES: VehicleCategory[] = ["executive", "luxury", "suv", "mpv"];
const TRIP_TYPES: TripType[] = ["airport_pickup", "airport_dropoff", "distance", "hourly", "daily"];

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
    categories: ["executive", "luxury", "suv", "mpv"],
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
    categories: (r.scenarios ?? []).map(s => s.vehicle_category_id),
  };
}

function tripIcon(type: TripType) {
  if (type === "airport_pickup" || type === "airport_dropoff") return <Plane className="h-4 w-4" />;
  if (type === "hourly" || type === "daily") return <Clock className="h-4 w-4" />;
  return <RouteIcon className="h-4 w-4" />;
}

export function RoutesTab() {
  const [routes, setRoutes] = useState<MarketRouteTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<RouteForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/market-pricing/routes");
    const json = await res.json();
    setRoutes(json.routes ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (form !== null) setTimeout(() => nameRef.current?.focus(), 50); }, [form]);

  function set(field: keyof RouteForm, value: string | VehicleCategory[]) {
    setForm(f => f ? { ...f, [field]: value } : f);
  }

  function toggleCat(cat: VehicleCategory) {
    setForm(f => {
      if (!f) return f;
      const cats = f.categories.includes(cat) ? f.categories.filter(c => c !== cat) : [...f.categories, cat];
      return { ...f, categories: cats };
    });
  }

  function swapAddresses() {
    setForm(f => f ? { ...f, pickup_label: f.dropoff_label, dropoff_label: f.pickup_label } : f);
  }

  async function save() {
    if (!form) return;
    if (!form.name.trim()) { setError("Name is required."); return; }
    if (form.categories.length === 0) { setError("Select at least one vehicle category."); return; }
    setSaving(true);
    setError(null);
    try {
      const payload = {
        id: form.id ?? undefined,
        name: form.name.trim(),
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
      const method = form.id ? "PATCH" : "POST";
      const res = await fetch("/api/admin/market-pricing/routes", {
        method,
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
    if (!confirm("Delete this route? All associated weekly checks will lose this route.")) return;
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

  return (
    <div className="p-8 max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Route Templates</h2>
          <p className="text-sm text-muted-foreground mt-0.5">{routes.length} routes · reused across all weekly checks</p>
        </div>
        <Button size="sm" onClick={() => { setForm(blankForm()); setError(null); }}>
          <Plus className="h-4 w-4 mr-1.5" />
          Add route
        </Button>
      </div>

      {/* Form */}
      {form !== null && (
        <div className="rounded-xl border border-primary/30 bg-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-foreground">{form.id ? "Edit route" : "New route"}</p>
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => { setForm(null); setError(null); }}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 grid grid-cols-3 gap-3">
              <Input
                ref={nameRef}
                placeholder="Route name (e.g. LHR → Mayfair)"
                value={form.name}
                onChange={e => set("name", e.target.value)}
                className="col-span-2"
              />
              <Select value={form.trip_type} onValueChange={v => set("trip_type", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Trip type" />
                </SelectTrigger>
                <SelectContent>
                  {TRIP_TYPES.map(t => (
                    <SelectItem key={t} value={t}>{TRIP_TYPE_LABELS[t]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {(isAirport(form.trip_type) || isDistance(form.trip_type)) && (
              <>
                <div className="col-span-2 flex gap-2 items-center">
                  <Input
                    placeholder="Pickup (e.g. Heathrow Terminal 5)"
                    value={form.pickup_label}
                    onChange={e => set("pickup_label", e.target.value)}
                    className="flex-1"
                  />
                  <Button variant="outline" size="sm" className="h-9 px-2.5" onClick={() => navigator.clipboard.writeText(form.pickup_label)} title="Copy pickup">
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="outline" size="sm" className="h-9 px-2.5" onClick={swapAddresses} title="Swap">
                    <ArrowLeftRight className="h-3.5 w-3.5" />
                  </Button>
                  <Input
                    placeholder="Dropoff (e.g. Mayfair, London)"
                    value={form.dropoff_label}
                    onChange={e => set("dropoff_label", e.target.value)}
                    className="flex-1"
                  />
                  <Button variant="outline" size="sm" className="h-9 px-2.5" onClick={() => navigator.clipboard.writeText(form.dropoff_label)} title="Copy dropoff">
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                </div>
                {isAirport(form.trip_type) && (
                  <Input
                    placeholder="Airport code (LHR, LGW…)"
                    value={form.airport_code}
                    onChange={e => set("airport_code", e.target.value)}
                  />
                )}
                {isDistance(form.trip_type) && (
                  <Select value={form.distance_band} onValueChange={v => set("distance_band", v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Distance band" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(BAND_LABELS).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <Input
                  placeholder="Distance (miles)"
                  type="number"
                  min="0"
                  value={form.distance_miles}
                  onChange={e => set("distance_miles", e.target.value)}
                />
                <Input
                  placeholder="Duration (minutes)"
                  type="number"
                  min="0"
                  value={form.duration_minutes}
                  onChange={e => set("duration_minutes", e.target.value)}
                />
              </>
            )}

            {isHourly(form.trip_type) && (
              <>
                <Input
                  placeholder="Billed hours (e.g. 4)"
                  type="number"
                  min="1"
                  step="0.5"
                  value={form.hourly_billed_hours}
                  onChange={e => set("hourly_billed_hours", e.target.value)}
                />
                <Input
                  placeholder="Pickup location (optional)"
                  value={form.pickup_label}
                  onChange={e => set("pickup_label", e.target.value)}
                />
              </>
            )}

            {isDaily(form.trip_type) && (
              <>
                <Input
                  placeholder="Days"
                  type="number"
                  min="1"
                  value={form.daily_days}
                  onChange={e => set("daily_days", e.target.value)}
                />
                <Input
                  placeholder="Included hours per day (e.g. 10)"
                  type="number"
                  min="1"
                  step="0.5"
                  value={form.daily_included_hours}
                  onChange={e => set("daily_included_hours", e.target.value)}
                />
              </>
            )}
          </div>

          {/* Categories */}
          <div>
            <p className="text-xs text-muted-foreground mb-2">Vehicle categories</p>
            <div className="flex gap-2 flex-wrap">
              {ALL_CATEGORIES.map(cat => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => toggleCat(cat)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
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

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" size="sm" onClick={() => { setForm(null); setError(null); }}>Cancel</Button>
            <Button size="sm" onClick={save} disabled={saving}>
              <Check className="h-4 w-4 mr-1" />
              {saving ? "Saving…" : "Save route"}
            </Button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-2">{[...Array(5)].map((_, i) => <div key={i} className="h-14 rounded-xl bg-card animate-pulse" />)}</div>
      ) : routes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <RouteIcon className="h-10 w-10 text-muted-foreground/40 mb-3" />
          <p className="text-sm font-medium text-foreground">No routes yet</p>
          <p className="text-xs text-muted-foreground mt-1">Add your first route template above.</p>
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
                    className="group flex items-center gap-4 rounded-xl border border-border bg-card px-4 py-2.5 hover:border-border/80 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-foreground">{r.name}</span>
                        {r.distance_miles && (
                          <span className="text-xs text-muted-foreground">{r.distance_miles} mi</span>
                        )}
                        {r.duration_minutes && (
                          <span className="text-xs text-muted-foreground">{r.duration_minutes} min</span>
                        )}
                        {r.hourly_billed_hours && (
                          <span className="text-xs text-muted-foreground">{r.hourly_billed_hours}h billed</span>
                        )}
                        {r.daily_days && r.daily_days > 1 && (
                          <span className="text-xs text-muted-foreground">{r.daily_days} days</span>
                        )}
                        {r.daily_included_hours && (
                          <span className="text-xs text-muted-foreground">{r.daily_included_hours}h/day incl.</span>
                        )}
                        {r.distance_band && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">{BAND_LABELS[r.distance_band]}</Badge>
                        )}
                      </div>
                      {(r.pickup_label || r.dropoff_label) && (
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">
                          {r.pickup_label} {r.pickup_label && r.dropoff_label ? "→" : ""} {r.dropoff_label}
                        </p>
                      )}
                      <div className="flex gap-1 mt-1 flex-wrap">
                        {(r.scenarios ?? []).map(s => (
                          <span key={s.id} className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                            {VEHICLE_CATEGORY_LABELS[s.vehicle_category_id]}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={() => { setForm(routeToForm(r)); setError(null); }}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                        onClick={() => remove(r.id)}
                      >
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
