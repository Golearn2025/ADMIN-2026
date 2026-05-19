"use client";

import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "@/components/common/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiFetch } from "@/lib/api/apiClient";
import {
  Car,
  Check,
  Clock,
  MapPin,
  Percent,
  Plane,
  Plus,
  RefreshCw,
  RotateCcw,
  Save,
  SlidersHorizontal,
  Tag,
  Timer,
  TrendingUp,
  Users,
  Sparkles,
  Building2,
  BadgeDollarSign,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Row = Record<string, unknown>;
type PricingMap = Record<string, Row[]>;
type ColType = "text" | "pence" | "number" | "boolean" | "readonly";
type PricingVersion = {
  id: string;
  version_name: string;
  version_number: number;
  is_active: boolean;
  is_published: boolean;
  created_at: string | null;
};

interface ColDef {
  key: string;
  label: string;
  type: ColType;
  width?: string;
}

// ─── Column definitions ───────────────────────────────────────────────────────

const COLS: Record<string, ColDef[]> = {
  pricing_vehicle_rates: [
    { key: "vehicle_category_id", label: "Vehicle", type: "readonly", width: "145px" },
    { key: "booking_type", label: "Type", type: "readonly", width: "130px" },
    { key: "base_fare_pence", label: "Base fare", type: "pence", width: "150px" },
    { key: "per_mile_first_6_pence", label: "£/mi 1–6", type: "pence", width: "146px" },
    { key: "per_mile_after_6_pence", label: "£/mi 6+", type: "pence", width: "146px" },
    { key: "per_minute_pence", label: "£/min", type: "pence", width: "132px" },
    { key: "minimum_fare_pence", label: "Min fare", type: "pence", width: "146px" },
    { key: "hourly_rate_pence", label: "Hourly", type: "pence", width: "146px" },
    { key: "active", label: "Active", type: "boolean", width: "90px" },
  ],
  pricing_time_rules: [
    { key: "rule_name", label: "Rule", type: "text", width: "160px" },
    { key: "day_of_week", label: "Day", type: "number", width: "55px" },
    { key: "start_time", label: "Start", type: "text", width: "80px" },
    { key: "end_time", label: "End", type: "text", width: "80px" },
    { key: "multiplier", label: "Multiplier", type: "number", width: "92px" },
    { key: "active", label: "Active", type: "boolean", width: "72px" },
  ],
  pricing_airport_fees: [
    { key: "airport_code", label: "Airport", type: "readonly", width: "80px" },
    { key: "pickup_fee_pence", label: "Pickup", type: "pence", width: "132px" },
    { key: "dropoff_fee_pence", label: "Dropoff", type: "pence", width: "132px" },
    { key: "parking_fee_pence", label: "Parking", type: "pence", width: "132px" },
    { key: "included_wait_minutes", label: "Free wait (min)", type: "number", width: "120px" },
    { key: "extra_wait_per_minute_pence", label: "Extra wait/min", type: "pence", width: "150px" },
    { key: "active", label: "Active", type: "boolean", width: "72px" },
  ],
  pricing_zone_fees: [
    { key: "zone_code", label: "Zone", type: "readonly", width: "120px" },
    { key: "fee_pence", label: "Fee", type: "pence", width: "132px" },
    { key: "active", label: "Active", type: "boolean", width: "72px" },
  ],
  pricing_hourly_rules: [
    { key: "vehicle_category_id", label: "Vehicle", type: "readonly", width: "120px" },
    { key: "minimum_hours", label: "Min hrs", type: "number", width: "80px" },
    { key: "maximum_hours", label: "Max hrs", type: "number", width: "80px" },
    { key: "billing_increment_hours", label: "Increment", type: "number", width: "96px" },
    { key: "active", label: "Active", type: "boolean", width: "72px" },
  ],
  pricing_daily_rules: [
    { key: "vehicle_category_id", label: "Vehicle", type: "readonly", width: "120px" },
    { key: "included_hours", label: "Incl. hrs", type: "number", width: "84px" },
    { key: "extra_hour_rate_pence", label: "Extra hr rate", type: "pence", width: "150px" },
    { key: "included_miles", label: "Incl. mi", type: "number", width: "84px" },
    { key: "extra_mile_rate_pence", label: "Extra mi rate", type: "pence", width: "150px" },
    { key: "active", label: "Active", type: "boolean", width: "72px" },
  ],
  pricing_return_rules: [
    { key: "discount_percent", label: "Discount %", type: "number", width: "120px" },
    { key: "active", label: "Active", type: "boolean", width: "72px" },
  ],
  pricing_fleet_discounts: [
    { key: "min_vehicles", label: "Min vehicles", type: "number", width: "120px" },
    { key: "discount_percent", label: "Discount %", type: "number", width: "120px" },
    { key: "active", label: "Active", type: "boolean", width: "72px" },
  ],
  pricing_rounding_rules: [
    { key: "rounding_step_pence", label: "Step (£)", type: "pence", width: "132px" },
    { key: "rounding_mode", label: "Mode (ceil/floor/nearest)", type: "text", width: "180px" },
  ],
  pricing_commission_profiles: [
    { key: "platform_fee_percent", label: "Platform %", type: "number", width: "120px" },
    { key: "operator_fee_percent", label: "Operator %", type: "number", width: "120px" },
    { key: "active", label: "Active", type: "boolean", width: "72px" },
  ],
  payout_escalation_tiers: [
    { key: "label",                  label: "Label",          type: "text",    width: "200px" },
    { key: "min_hours_before_job",   label: "Min hours",      type: "number",  width: "110px" },
    { key: "max_hours_before_job",   label: "Max hours",      type: "number",  width: "110px" },
    { key: "driver_payout_factor",   label: "Factor (0-1)",   type: "number",  width: "130px" },
    { key: "sort_order",             label: "Order",          type: "number",  width: "80px" },
    { key: "is_active",              label: "Active",         type: "boolean", width: "80px" },
  ],
  service_items: [
    { key: "id",            label: "ID",            type: "readonly", width: "200px" },
    { key: "name",          label: "Name",          type: "text",     width: "220px" },
    { key: "price_pence",   label: "Client price",  type: "pence",    width: "140px" },
    { key: "item_group",    label: "Group",         type: "text",     width: "140px" },
    { key: "display_order", label: "Order",         type: "number",   width: "80px" },
    { key: "is_active",     label: "Active",        type: "boolean",  width: "80px" },
  ],
  service_item_payout_rules: [
    { key: "service_item_id",  label: "Service",       type: "readonly", width: "200px" },
    { key: "recipient_type",   label: "Recipient",     type: "readonly", width: "110px" },
    { key: "payout_mode",      label: "Mode",          type: "text",     width: "110px" },
    { key: "payout_value",     label: "Bonus (£)",     type: "pence",    width: "130px" },
    { key: "is_active",        label: "Active",        type: "boolean",  width: "80px" },
  ],
  service_suppliers: [
    { key: "service_item_id",      label: "Service ID",    type: "text",     width: "180px" },
    { key: "name",                 label: "Supplier name", type: "text",     width: "200px" },
    { key: "address",              label: "Address",       type: "text",     width: "260px" },
    { key: "phone",                label: "Phone",         type: "text",     width: "160px" },
    { key: "pickup_instructions",  label: "Instructions",  type: "text",     width: "320px" },
    { key: "is_default",           label: "Default",       type: "boolean",  width: "80px" },
    { key: "is_active",            label: "Active",        type: "boolean",  width: "80px" },
  ],
  pricing_versions: [
    { key: "version_name", label: "Name", type: "text", width: "160px" },
    { key: "version_number", label: "Ver.", type: "number", width: "55px" },
    { key: "is_active", label: "Active", type: "boolean", width: "72px" },
    { key: "is_published", label: "Published", type: "boolean", width: "88px" },
    { key: "effective_from", label: "From", type: "text", width: "128px" },
    { key: "effective_until", label: "Until", type: "text", width: "128px" },
    { key: "multi_stop_fee_pence", label: "Multi-stop", type: "pence", width: "132px" },
    { key: "driver_pricing_factor", label: "Driver ×", type: "number", width: "84px" },
  ],
};

const TABS = [
  { key: "pricing_vehicle_rates", label: "Vehicle Rates", icon: Car },
  { key: "pricing_time_rules", label: "Time Rules", icon: Clock },
  { key: "pricing_airport_fees", label: "Airport Fees", icon: Plane },
  { key: "pricing_zone_fees", label: "Zone Fees", icon: MapPin },
  { key: "pricing_hourly_rules", label: "Hourly", icon: Timer },
  { key: "pricing_daily_rules", label: "Daily", icon: Tag },
  { key: "pricing_return_rules", label: "Return", icon: RotateCcw },
  { key: "pricing_fleet_discounts", label: "Fleet", icon: Users },
  { key: "pricing_rounding_rules", label: "Rounding", icon: SlidersHorizontal },
  { key: "pricing_commission_profiles", label: "Commission", icon: Percent },
  { key: "pricing_versions", label: "Versions", icon: Tag },
  // Driver payout tiers
  { key: "payout_escalation_tiers", label: "Driver Tiers", icon: TrendingUp },
  // Extra services
  { key: "service_items", label: "Extras Items", icon: Sparkles },
  { key: "service_item_payout_rules", label: "Driver Bonuses", icon: BadgeDollarSign },
  { key: "service_suppliers", label: "Suppliers", icon: Building2 },
] as const;

const CREATABLE_TABLES = new Set<string>([
  "payout_escalation_tiers",
  "service_suppliers",
  "service_item_payout_rules",
]);

const BOOKING_TYPE_ORDER: Record<string, number> = {
  oneway: 1,
  return: 2,
  hourly: 3,
  daily: 4,
  fleet: 5,
  fleet_hourly: 6,
  fleet_daily: 7,
};

const VEHICLE_ORDER: Record<string, number> = {
  executive: 1,
  luxury: 2,
  suv: 3,
  mpv: 4,
  van: 4,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function penceToPounds(pence: unknown): string {
  if (pence === null || pence === undefined || pence === "") return "";
  return (Number(pence) / 100).toFixed(2);
}

function poundsToPence(str: string): number | null {
  const n = parseFloat(str);
  return isNaN(n) ? null : Math.round(n * 100);
}

function getDisplayValue(col: ColDef, raw: unknown): string {
  if (col.type === "pence") return penceToPounds(raw);
  if (raw === null || raw === undefined) return "";
  return String(raw);
}

function parseValue(col: ColDef, raw: string): unknown {
  if (col.type === "pence") return poundsToPence(raw);
  if (col.type === "number") return raw === "" ? null : Number(raw);
  if (col.type === "boolean") return raw === "true";
  return raw;
}

function sortPricingRows(table: string, rows: Row[]): Row[] {
  if (table !== "pricing_vehicle_rates") return rows;

  return [...rows].sort((a, b) => {
    const bookingA = String(a.booking_type ?? "");
    const bookingB = String(b.booking_type ?? "");
    const vehicleA = String(a.vehicle_category_id ?? "");
    const vehicleB = String(b.vehicle_category_id ?? "");

    const bookingCmp =
      (BOOKING_TYPE_ORDER[bookingA] ?? 999) - (BOOKING_TYPE_ORDER[bookingB] ?? 999);
    if (bookingCmp !== 0) return bookingCmp;

    const vehicleCmp = (VEHICLE_ORDER[vehicleA] ?? 999) - (VEHICLE_ORDER[vehicleB] ?? 999);
    if (vehicleCmp !== 0) return vehicleCmp;

    return String(a.id ?? "").localeCompare(String(b.id ?? ""));
  });
}

function normalizePricingData(raw: PricingMap): PricingMap {
  const next: PricingMap = {};
  for (const [table, rows] of Object.entries(raw || {})) {
    next[table] = sortPricingRows(table, rows || []);
  }
  return next;
}

const VEHICLE_COLORS: Record<string, string> = {
  executive: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  luxury: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  suv: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  mpv: "bg-teal-500/10 text-teal-400 border-teal-500/20",
  van: "bg-teal-500/10 text-teal-400 border-teal-500/20",
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function ActiveBadge({
  value,
  onChange,
  readonly,
}: {
  value: unknown;
  onChange: (v: string) => void;
  readonly?: boolean;
}) {
  const active = value === true || value === "true";
  if (readonly) {
    return (
      <span
        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold border ${
          active
            ? "bg-green-500/10 text-green-400 border-green-500/20"
            : "bg-zinc-500/10 text-zinc-400 border-zinc-500/20"
        }`}
      >
        {active ? "Active" : "Off"}
      </span>
    );
  }
  return (
    <button
      type="button"
      onClick={() => onChange(active ? "false" : "true")}
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold border transition-all cursor-pointer ${
        active
          ? "bg-green-500/10 text-green-400 border-green-500/20 hover:bg-green-500/20"
          : "bg-zinc-500/10 text-zinc-400 border-zinc-500/20 hover:bg-zinc-500/20"
      }`}
    >
      {active ? "Active" : "Off"}
    </button>
  );
}

function ReadonlyPill({ value, table }: { value: unknown; table: string }) {
  const str = String(value ?? "");
  const color =
    table === "pricing_vehicle_rates" || table === "pricing_hourly_rules" || table === "pricing_daily_rules"
      ? VEHICLE_COLORS[str.toLowerCase()] || "bg-zinc-500/10 text-zinc-400 border-zinc-500/20"
      : "bg-zinc-500/10 text-zinc-400 border-zinc-500/20";
  return (
    <span className={`inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-semibold ${color}`}>
      {str}
    </span>
  );
}

function PricingTable({
  table,
  rows,
  cols,
  onSave,
  onCreate,
  creating,
}: {
  table: string;
  rows: Row[];
  cols: ColDef[];
  onSave: (table: string, id: string, updates: Row) => Promise<void>;
  onCreate?: () => Promise<void>;
  creating?: boolean;
}) {
  const [localRows, setLocalRows] = useState<Row[]>(rows);
  const [dirty, setDirty] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [draftValues, setDraftValues] = useState<Record<string, string>>({});

  const getDraftKey = (id: string, colKey: string) => `${id}:${colKey}`;

  useEffect(() => {
    setLocalRows(rows);
    setDirty(new Set());
    setDraftValues({});
  }, [rows]);

  const handleChange = (rowIdx: number, col: ColDef, rawValue: string) => {
    const id = String(localRows[rowIdx].id ?? rowIdx);
    const draftKey = getDraftKey(id, col.key);
    setDraftValues((prev) => ({ ...prev, [draftKey]: rawValue }));

    // For money fields we keep the raw typed value until blur/save,
    // so users can type naturally (e.g. "90." then "90.00").
    if (col.type !== "pence") {
      setLocalRows((prev) => {
        const next = [...prev];
        next[rowIdx] = { ...next[rowIdx], [col.key]: parseValue(col, rawValue) };
        return next;
      });
    }

    setDirty((prev) => new Set(prev).add(id));
  };

  const handleBlur = (rowIdx: number, col: ColDef) => {
    if (col.type !== "pence") return;

    const id = String(localRows[rowIdx].id ?? rowIdx);
    const draftKey = getDraftKey(id, col.key);
    const rawValue = draftValues[draftKey];
    if (rawValue === undefined) return;

    const parsed = parseValue(col, rawValue);
    setLocalRows((prev) => {
      const next = [...prev];
      next[rowIdx] = { ...next[rowIdx], [col.key]: parsed };
      return next;
    });
    setDraftValues((prev) => ({
      ...prev,
      [draftKey]: getDisplayValue(col, parsed),
    }));
  };

  const handleSave = async (rowIdx: number) => {
    const row = localRows[rowIdx];
    const id = String(row.id ?? "");
    if (!id) return;
    setSaving(id);
    setSaveError(null);
    try {
      const updates: Row = {};
      for (const col of cols) {
        if (col.type === "readonly") continue;
        const draftKey = getDraftKey(id, col.key);
        const raw =
          draftValues[draftKey] !== undefined
            ? draftValues[draftKey]
            : getDisplayValue(col, row[col.key]);
        updates[col.key] = parseValue(col, raw);
      }
      await onSave(table, id, updates);
      setDirty((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      setDraftValues((prev) => {
        const next = { ...prev };
        for (const col of cols) {
          delete next[getDraftKey(id, col.key)];
        }
        return next;
      });
      setSaved(id);
      setTimeout(() => setSaved(null), 2000);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Save failed";
      setSaveError(msg);
    } finally {
      setSaving(null);
    }
  };

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="rounded-full bg-muted p-4 mb-3">
          <SlidersHorizontal className="h-6 w-6 text-muted-foreground" />
        </div>
        <p className="text-sm font-medium text-foreground">No rows yet</p>
        <p className="text-xs text-muted-foreground mt-1 mb-4">
          {onCreate ? "Add your first row below." : "No data for this section."}
        </p>
        {onCreate && (
          <Button size="sm" onClick={onCreate} disabled={creating}>
            {creating ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Plus className="h-4 w-4 mr-2" />
            )}
            Add row
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {saveError && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-400">
          {saveError}
        </div>
      )}
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {/* header row */}
      <div className="flex items-center border-b border-border bg-muted/30">
        {cols.map((col) => (
          <div
            key={col.key}
            style={{ minWidth: col.width, width: col.width }}
            className="shrink-0 px-4 py-3.5 text-sm font-semibold uppercase tracking-wider text-muted-foreground"
          >
            {col.label}
          </div>
        ))}
        {/* save col */}
        <div className="flex-1 px-3 py-2.5" />
      </div>

      {/* data rows */}
      <div className="divide-y divide-border/60">
        {localRows.map((row, rowIdx) => {
          const id = String(row.id ?? rowIdx);
          const isDirty = dirty.has(id);
          const isSaving = saving === id;
          const isJustSaved = saved === id;

          return (
            <div
              key={id}
              className={`flex items-center transition-colors ${
                isDirty ? "bg-amber-500/5" : "hover:bg-muted/20"
              }`}
            >
              {cols.map((col) => {
                const raw = row[col.key];

                if (col.type === "readonly") {
                  return (
                    <div
                      key={col.key}
                      style={{ minWidth: col.width, width: col.width }}
                      className="shrink-0 px-4 py-2.5"
                    >
                      <ReadonlyPill value={raw} table={table} />
                    </div>
                  );
                }

                if (col.type === "boolean") {
                  return (
                    <div
                      key={col.key}
                      style={{ minWidth: col.width, width: col.width }}
                      className="shrink-0 px-4 py-2.5"
                    >
                      <ActiveBadge
                        value={row[col.key]}
                        onChange={(v) => handleChange(rowIdx, col, v)}
                      />
                    </div>
                  );
                }

                const displayVal = getDisplayValue(col, raw);
                const draftKey = getDraftKey(id, col.key);
                const value = draftValues[draftKey] ?? displayVal;
                const prefix = col.type === "pence" ? "£" : "";

                return (
                  <div
                    key={col.key}
                    style={{ minWidth: col.width, width: col.width }}
                    className="shrink-0 px-4 py-2.5"
                  >
                    <div className="relative flex items-center">
                      {prefix && (
                        <span className="absolute left-3 text-base text-muted-foreground select-none pointer-events-none">
                          £
                        </span>
                      )}
                      <Input
                        value={value}
                        onChange={(e) => handleChange(rowIdx, col, e.target.value)}
                        onBlur={() => handleBlur(rowIdx, col)}
                        inputMode={col.type === "pence" ? "decimal" : undefined}
                        className={`h-10 text-base font-mono bg-transparent border-border/50 focus:border-primary focus:bg-background transition-colors ${prefix ? "pl-8" : ""}`}
                      />
                    </div>
                  </div>
                );
              })}

              {/* save / saved */}
              <div className="flex-1 flex items-center justify-end pr-3 gap-2">
                {isJustSaved && !isDirty && (
                  <span className="flex items-center gap-1 text-xs text-green-400 font-medium">
                    <Check className="h-3 w-3" /> Saved
                  </span>
                )}
                {isDirty && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-10 px-4 text-base border-primary/40 text-primary hover:bg-primary/10"
                    onClick={() => handleSave(rowIdx)}
                    disabled={isSaving}
                  >
                    {isSaving ? (
                      <RefreshCw className="h-3 w-3 animate-spin mr-1" />
                    ) : (
                      <Save className="h-3 w-3 mr-1" />
                    )}
                    {isSaving ? "Saving…" : "Save"}
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PricesPage() {
  const [pricing, setPricing] = useState<PricingMap>({});
  const [versions, setVersions] = useState<PricingVersion[]>([]);
  const [selectedVersionId, setSelectedVersionId] = useState<string>("");
  const [vehicleTypeFilter, setVehicleTypeFilter] = useState<string>("all");
  const [bookingTypeFilter, setBookingTypeFilter] = useState<string>("all");
  const [versionsFilter, setVersionsFilter] = useState<"active" | "inactive" | "all">("active");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creatingTable, setCreatingTable] = useState<string | null>(null);
  const [activeVersionId, setActiveVersionId] = useState<string>("");

  const fetchPricing = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const query = selectedVersionId
        ? `/api/admin/pricing?versionId=${encodeURIComponent(selectedVersionId)}`
        : "/api/admin/pricing";
      const res = await apiFetch(query);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to fetch pricing");
      setPricing(normalizePricingData(data.pricing || {}));
      const apiVersions: PricingVersion[] = data.available_versions || [];
      setVersions(apiVersions);
      if (data.active_pricing_version_id) {
        setActiveVersionId(data.active_pricing_version_id);
      }
      if (!selectedVersionId && data.active_pricing_version_id) {
        setSelectedVersionId(data.active_pricing_version_id);
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [selectedVersionId]);

  useEffect(() => {
    fetchPricing();
  }, [fetchPricing]);

  const handleSave = useCallback(async (table: string, id: string, updates: Row) => {
    const res = await apiFetch("/api/admin/pricing", {
      method: "PATCH",
      body: JSON.stringify({ table, id, updates }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || "Save failed");

    const savedRow = (data.row as Row) || updates;
    setPricing((prev) => ({
      ...prev,
      [table]: sortPricingRows(
        table,
        (prev[table] || []).map((r) => (String(r.id) === id ? { ...r, ...savedRow } : r))
      ),
    }));
  }, []);

  const handleCreate = useCallback(
    async (table: string) => {
      setCreatingTable(table);
      try {
        const res = await apiFetch("/api/admin/pricing", {
          method: "POST",
          body: JSON.stringify({
            table,
            pricing_version_id: selectedVersionId || activeVersionId || undefined,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "Create failed");
        await fetchPricing();
      } finally {
        setCreatingTable(null);
      }
    },
    [selectedVersionId, activeVersionId, fetchPricing]
  );

  // count of visible (non-null) rows per tab
  const rowCount = (key: string) => (pricing[key] || []).length;
  const vehicleRowsAll = (pricing["pricing_vehicle_rates"] || []) as Row[];
  const vehicleTypeOptions = Array.from(
    new Set(vehicleRowsAll.map((r) => String(r.vehicle_category_id || "")).filter(Boolean))
  );
  const bookingTypeOptions = Array.from(
    new Set(vehicleRowsAll.map((r) => String(r.booking_type || "")).filter(Boolean))
  );

  return (
    <div className="flex flex-col min-h-0 h-full">
      <PageHeader
        title="Prices"
        subtitle="Edit pricing values — changes reflect immediately in the booking engine."
        actions={
          <div className="flex items-center gap-2">
            <div className="w-[260px]">
              <Select
                value={selectedVersionId || "active"}
                onValueChange={(value) => {
                  if (value === "active") {
                    setSelectedVersionId("");
                    return;
                  }
                  setSelectedVersionId(value);
                }}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Active version" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active version (default)</SelectItem>
                  {versions.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {`v${v.version_number} - ${v.version_name}${v.is_active ? " (active)" : ""}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button variant="outline" size="sm" onClick={fetchPricing} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        }
      />

      {loading ? (
        <div className="flex items-center justify-center flex-1 gap-2 text-sm text-muted-foreground py-24">
          <RefreshCw className="h-4 w-4 animate-spin" />
          Loading pricing data…
        </div>
      ) : error ? (
        <div className="m-8">
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6">
            <p className="text-sm font-semibold text-destructive mb-1">Failed to load pricing</p>
            <p className="text-xs text-muted-foreground">{error}</p>
            <Button size="sm" variant="outline" className="mt-4" onClick={fetchPricing}>
              Try again
            </Button>
          </div>
        </div>
      ) : (
        <Tabs defaultValue="pricing_vehicle_rates" className="flex flex-col flex-1 min-h-0">
          {/* ── tab strip ── */}
          <div className="border-b border-border px-8 pt-3 bg-card">
            <TabsList className="h-auto bg-transparent p-0 gap-0.5 border-none flex-wrap">
              {TABS.map(({ key, label, icon: Icon }) => {
                const count = rowCount(key);
                return (
                  <TabsTrigger
                    key={key}
                    value={key}
                    className="relative flex items-center gap-1.5 rounded-none border-b-2 border-transparent px-4 py-2.5 text-xs font-medium text-muted-foreground transition-all data-[state=active]:border-primary data-[state=active]:text-foreground data-[state=active]:bg-transparent hover:text-foreground bg-transparent"
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0" />
                    <span>{label}</span>
                    {count > 0 && (
                      <span className="ml-0.5 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground leading-none">
                        {count}
                      </span>
                    )}
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </div>

          {/* ── tab content ── */}
          <div className="flex-1 overflow-auto px-8 py-6">
            {TABS.map(({ key }) => {
              let rows = pricing[key] || [];
              if (key === "pricing_vehicle_rates") {
                rows = rows.filter((row) => {
                  const vehicleOk =
                    vehicleTypeFilter === "all" ||
                    String(row.vehicle_category_id || "") === vehicleTypeFilter;
                  const bookingOk =
                    bookingTypeFilter === "all" ||
                    String(row.booking_type || "") === bookingTypeFilter;
                  return vehicleOk && bookingOk;
                });
              }
              if (key === "pricing_versions") {
                rows = rows.filter((row) => {
                  const active = Boolean(row.is_active);
                  if (versionsFilter === "active") return active;
                  if (versionsFilter === "inactive") return !active;
                  return true;
                });
              }
              const cols = COLS[key] || [];
              return (
                <TabsContent key={key} value={key} className="mt-0 focus-visible:outline-none">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <h2 className="text-sm font-semibold text-foreground">
                        {TABS.find((t) => t.key === key)?.label}
                      </h2>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {rows.length} {rows.length === 1 ? "row" : "rows"} — click a field to edit, then save per row.
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {key === "pricing_vehicle_rates" && (
                        <>
                          <Select value={vehicleTypeFilter} onValueChange={setVehicleTypeFilter}>
                            <SelectTrigger className="h-8 w-[150px]">
                              <SelectValue placeholder="Vehicle" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All vehicles</SelectItem>
                              {vehicleTypeOptions.map((v) => (
                                <SelectItem key={v} value={v}>
                                  {v}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Select value={bookingTypeFilter} onValueChange={setBookingTypeFilter}>
                            <SelectTrigger className="h-8 w-[150px]">
                              <SelectValue placeholder="Booking type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All booking types</SelectItem>
                              {bookingTypeOptions.map((v) => (
                                <SelectItem key={v} value={v}>
                                  {v}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </>
                      )}
                      {key === "pricing_versions" && (
                        <div className="flex items-center gap-1 rounded-md border border-border p-0.5">
                          <Button
                            size="sm"
                            variant={versionsFilter === "active" ? "default" : "ghost"}
                            className="h-7 px-2 text-xs"
                            onClick={() => setVersionsFilter("active")}
                          >
                            Active
                          </Button>
                          <Button
                            size="sm"
                            variant={versionsFilter === "inactive" ? "default" : "ghost"}
                            className="h-7 px-2 text-xs"
                            onClick={() => setVersionsFilter("inactive")}
                          >
                            Inactive
                          </Button>
                          <Button
                            size="sm"
                            variant={versionsFilter === "all" ? "default" : "ghost"}
                            className="h-7 px-2 text-xs"
                            onClick={() => setVersionsFilter("all")}
                          >
                            All
                          </Button>
                        </div>
                      )}
                      {rows.filter((r) => r.active === true).length > 0 && (
                        <Badge variant="success" className="text-[11px] px-2 py-0.5">
                          {rows.filter((r) => r.active === true).length} active
                        </Badge>
                      )}
                      {CREATABLE_TABLES.has(key) && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8"
                          disabled={creatingTable === key}
                          onClick={() => handleCreate(key)}
                        >
                          {creatingTable === key ? (
                            <RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                          ) : (
                            <Plus className="h-3.5 w-3.5 mr-1.5" />
                          )}
                          Add row
                        </Button>
                      )}
                    </div>
                  </div>
                  {key === "payout_escalation_tiers" && (
                    <p className="text-xs text-muted-foreground mb-3 -mt-2">
                      Driver payout rounds up to the nearest £1 in the driver app (same as client rounding).
                    </p>
                  )}
                  <PricingTable
                    table={key}
                    rows={rows}
                    cols={cols}
                    onSave={handleSave}
                    onCreate={CREATABLE_TABLES.has(key) ? () => handleCreate(key) : undefined}
                    creating={creatingTable === key}
                  />
                </TabsContent>
              );
            })}
          </div>
        </Tabs>
      )}
    </div>
  );
}
