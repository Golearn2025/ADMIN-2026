"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { apiFetch } from "@/lib/api/apiClient";
import { RefreshCw, Save } from "lucide-react";

type FinancialSettingsForm = {
  vat_rate_percent: number;
  vat_enabled: boolean;
  processor_fee_percent: number;
  processor_fixed_fee_pounds: number;
  default_operational_reserve_pounds: number;
  hourly_operational_reserve_pounds: number;
  daily_operational_reserve_pounds: number;
  fleet_operational_reserve_pounds: number;
  low_margin_warning_percent: number;
  minimum_profit_pounds: number;
};

const DEFAULT_FORM: FinancialSettingsForm = {
  vat_rate_percent: 20,
  vat_enabled: true,
  processor_fee_percent: 1.4,
  processor_fixed_fee_pounds: 0.2,
  default_operational_reserve_pounds: 0,
  hourly_operational_reserve_pounds: 0,
  daily_operational_reserve_pounds: 0,
  fleet_operational_reserve_pounds: 0,
  low_margin_warning_percent: 10,
  minimum_profit_pounds: 0,
};

export function OrganizationFinancialSettingsPanel() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [source, setSource] = useState<"organization_financial_settings" | "defaults">("defaults");
  const [form, setForm] = useState<FinancialSettingsForm>(DEFAULT_FORM);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch("/api/admin/organization-financial-settings");
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to load");
      setForm({
        vat_rate_percent: data.vat_rate_percent ?? DEFAULT_FORM.vat_rate_percent,
        vat_enabled: data.vat_enabled ?? DEFAULT_FORM.vat_enabled,
        processor_fee_percent: data.processor_fee_percent ?? DEFAULT_FORM.processor_fee_percent,
        processor_fixed_fee_pounds:
          data.processor_fixed_fee_pounds ?? DEFAULT_FORM.processor_fixed_fee_pounds,
        default_operational_reserve_pounds:
          data.default_operational_reserve_pounds ?? DEFAULT_FORM.default_operational_reserve_pounds,
        hourly_operational_reserve_pounds:
          data.hourly_operational_reserve_pounds ?? DEFAULT_FORM.hourly_operational_reserve_pounds,
        daily_operational_reserve_pounds:
          data.daily_operational_reserve_pounds ?? DEFAULT_FORM.daily_operational_reserve_pounds,
        fleet_operational_reserve_pounds:
          data.fleet_operational_reserve_pounds ?? DEFAULT_FORM.fleet_operational_reserve_pounds,
        low_margin_warning_percent:
          data.low_margin_warning_percent ?? DEFAULT_FORM.low_margin_warning_percent,
        minimum_profit_pounds: data.minimum_profit_pounds ?? DEFAULT_FORM.minimum_profit_pounds,
      });
      setSource(data.source ?? "defaults");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const res = await apiFetch("/api/admin/organization-financial-settings", {
        method: "PATCH",
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Save failed");
      setForm({
        vat_rate_percent: data.vat_rate_percent,
        vat_enabled: data.vat_enabled,
        processor_fee_percent: data.processor_fee_percent,
        processor_fixed_fee_pounds: data.processor_fixed_fee_pounds,
        default_operational_reserve_pounds: data.default_operational_reserve_pounds,
        hourly_operational_reserve_pounds: data.hourly_operational_reserve_pounds,
        daily_operational_reserve_pounds: data.daily_operational_reserve_pounds,
        fleet_operational_reserve_pounds: data.fleet_operational_reserve_pounds,
        low_margin_warning_percent: data.low_margin_warning_percent,
        minimum_profit_pounds: data.minimum_profit_pounds,
      });
      setSource(data.source ?? "organization_financial_settings");
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-12">
        <RefreshCw className="h-4 w-4 animate-spin" />
        Loading financial settings…
      </div>
    );
  }

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h2 className="text-sm font-semibold text-foreground">Financial Settings</h2>
        <p className="text-xs text-muted-foreground mt-1">
          Phase 1B — per-organization economics (payment processor fees, operational reserves, margin
          thresholds). Not connected to the quote engine yet. Requires DB table{" "}
          <span className="font-mono">organization_financial_settings</span> (migration not applied).
          {source === "defaults" && (
            <span className="block mt-1 text-amber-600">
              Showing defaults — save after the table exists to persist a row.
            </span>
          )}
        </p>
      </div>

      <div className="rounded-xl border border-border bg-card p-6 space-y-5">
        <p className="text-xs text-amber-600 border border-amber-500/30 rounded-md px-3 py-2 bg-amber-500/5">
          VAT for live quotes is edited under <strong>VAT &amp; Commission</strong> (
          <span className="font-mono">organization_settings</span>). Do not duplicate VAT here once this
          tab is enabled.
        </p>

        <PctField
          label="VAT (%) — Phase 1B only"
          hint="e.g. 20 = 20% (not used by quote engine until Phase 1B is wired)"
          value={form.vat_rate_percent}
          onChange={(v) => setForm((f) => ({ ...f, vat_rate_percent: v }))}
        />

        <div className="flex items-center gap-2">
          <Checkbox
            id="vat_enabled"
            checked={form.vat_enabled}
            onCheckedChange={(checked) =>
              setForm((f) => ({ ...f, vat_enabled: checked === true }))
            }
          />
          <label htmlFor="vat_enabled" className="text-xs font-medium text-foreground cursor-pointer">
            VAT enabled
          </label>
        </div>

        <PctField
          label="Payment processor fee (%)"
          hint="e.g. 1.4 = 1.4% of transaction value (Stripe/card)"
          value={form.processor_fee_percent}
          step={0.01}
          onChange={(v) => setForm((f) => ({ ...f, processor_fee_percent: v }))}
        />

        <PoundsField
          label="Fixed processor fee (£)"
          hint="e.g. 0.20 = 20p per transaction"
          value={form.processor_fixed_fee_pounds}
          onChange={(v) => setForm((f) => ({ ...f, processor_fixed_fee_pounds: v }))}
        />

        <div className="pt-2 border-t border-border/60 space-y-4">
          <p className="text-xs font-medium text-foreground">Operational reserves (£)</p>
          <PoundsField
            label="Default"
            hint="Default reserve deducted per quote (internal economics)"
            value={form.default_operational_reserve_pounds}
            onChange={(v) =>
              setForm((f) => ({ ...f, default_operational_reserve_pounds: v }))
            }
          />
          <PoundsField
            label="Hourly"
            hint="Reserve for hourly bookings"
            value={form.hourly_operational_reserve_pounds}
            onChange={(v) =>
              setForm((f) => ({ ...f, hourly_operational_reserve_pounds: v }))
            }
          />
          <PoundsField
            label="Daily"
            hint="Reserve for daily bookings"
            value={form.daily_operational_reserve_pounds}
            onChange={(v) =>
              setForm((f) => ({ ...f, daily_operational_reserve_pounds: v }))
            }
          />
          <PoundsField
            label="Fleet"
            hint="Reserve for fleet bookings"
            value={form.fleet_operational_reserve_pounds}
            onChange={(v) =>
              setForm((f) => ({ ...f, fleet_operational_reserve_pounds: v }))
            }
          />
        </div>

        <PctField
          label="Low margin warning (%)"
          hint="Threshold for internal margin validation (warn mode)"
          value={form.low_margin_warning_percent}
          onChange={(v) => setForm((f) => ({ ...f, low_margin_warning_percent: v }))}
        />

        <PoundsField
          label="Minimum profit (£)"
          hint="Minimum profit threshold per quote"
          value={form.minimum_profit_pounds}
          onChange={(v) => setForm((f) => ({ ...f, minimum_profit_pounds: v }))}
        />

        {error && <p className="text-xs text-destructive">{error}</p>}
        {saved && (
          <p className="text-xs text-emerald-600 font-medium">
            Saved (Phase 1B table only — not used for website quotes yet).
          </p>
        )}

        <div className="flex gap-2 pt-2">
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving ? (
              <RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5 mr-1.5" />
            )}
            Save
          </Button>
          <Button size="sm" variant="outline" onClick={load} disabled={saving}>
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
            Reload
          </Button>
        </div>
      </div>
    </div>
  );
}

function PctField({
  label,
  hint,
  value,
  onChange,
  step = 0.1,
}: {
  label: string;
  hint: string;
  value: number;
  onChange: (n: number) => void;
  step?: number;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-foreground">{label}</label>
      <Input
        type="number"
        min={0}
        max={100}
        step={step}
        className="h-9"
        value={String(value)}
        onChange={(e) => {
          const n = parseFloat(e.target.value);
          onChange(Number.isNaN(n) ? 0 : n);
        }}
      />
      <p className="text-[11px] text-muted-foreground">{hint}</p>
    </div>
  );
}

function PoundsField({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint: string;
  value: number;
  onChange: (n: number) => void;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-foreground">{label}</label>
      <div className="relative flex items-center">
        <span className="absolute left-3 text-sm text-muted-foreground select-none pointer-events-none">
          £
        </span>
        <Input
          type="number"
          min={0}
          step={0.01}
          className="h-9 pl-7"
          value={String(value)}
          onChange={(e) => {
            const n = parseFloat(e.target.value);
            onChange(Number.isNaN(n) ? 0 : n);
          }}
        />
      </div>
      <p className="text-[11px] text-muted-foreground">{hint}</p>
    </div>
  );
}
