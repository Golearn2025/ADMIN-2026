"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiFetch } from "@/lib/api/apiClient";
import { RefreshCw, Save } from "lucide-react";

type BillingSettings = {
  vat_rate_percent: number;
  platform_commission_percent: number;
  operator_commission_percent: number;
  currency?: string;
};

export function OrganizationBillingPanel() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState<BillingSettings>({
    vat_rate_percent: 20,
    platform_commission_percent: 10,
    operator_commission_percent: 9,
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch("/api/admin/organization-settings");
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to load");
      setForm({
        vat_rate_percent: data.vat_rate_percent ?? 20,
        platform_commission_percent: data.platform_commission_percent ?? 10,
        operator_commission_percent: data.operator_commission_percent ?? 9,
      });
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
      const res = await apiFetch("/api/admin/organization-settings", {
        method: "PATCH",
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Save failed");
      setForm({
        vat_rate_percent: data.vat_rate_percent,
        platform_commission_percent: data.platform_commission_percent,
        operator_commission_percent: data.operator_commission_percent,
      });
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
        Loading VAT & commission…
      </div>
    );
  }

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h2 className="text-sm font-semibold text-foreground">VAT & Commission</h2>
        <p className="text-xs text-muted-foreground mt-1">
          Live settings used by the pricing engine for website quotes and payouts: VAT on the client
          total, platform fee, and operator fee. Stored in{" "}
          <span className="font-mono">organization_settings</span>. VAT % here also drives the NET →
          VAT → FINAL WEBSITE PRICE preview on price tables.
        </p>
        <p className="text-xs text-muted-foreground mt-2 border-l-2 border-amber-500/40 pl-3">
          <span className="font-medium text-amber-600">Coming later (Phase 1B):</span> payment processor
          fees, operational reserves, and margin warnings — separate from this tab; not wired to quotes
          yet.
        </p>
      </div>

      <div className="rounded-xl border border-border bg-card p-6 space-y-5">
        <Field
          label="VAT (%)"
          hint="e.g. 20 = 20% VAT added to the client price"
          value={form.vat_rate_percent}
          onChange={(v) => setForm((f) => ({ ...f, vat_rate_percent: v }))}
        />
        <Field
          label="Platform commission (%)"
          hint="Percent of net transport subtotal (before VAT)"
          value={form.platform_commission_percent}
          onChange={(v) => setForm((f) => ({ ...f, platform_commission_percent: v }))}
        />
        <Field
          label="Operator commission (%)"
          hint="Percent of amount after platform commission"
          value={form.operator_commission_percent}
          onChange={(v) => setForm((f) => ({ ...f, operator_commission_percent: v }))}
        />

        {error && <p className="text-xs text-destructive">{error}</p>}
        {saved && (
          <p className="text-xs text-emerald-600 font-medium">
            Saved — pricing backend picks up new values (cache ~1 min).
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

function Field({
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
      <Input
        type="number"
        min={0}
        max={100}
        step={0.1}
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
