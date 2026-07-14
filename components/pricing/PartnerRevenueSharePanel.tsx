"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiFetch } from "@/lib/api/apiClient";
import { Plus, RefreshCw, Save } from "lucide-react";

type TierRow = {
  id?: string;
  min_bookings: number;
  max_bookings: number | null;
  share_percent: number;
  sort_order: number;
  is_active: boolean;
};

type PartnerConfig = {
  is_enabled: boolean;
  share_basis: string;
  tier_period: string;
};

export function PartnerRevenueSharePanel() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [orgType, setOrgType] = useState<string | null>(null);
  const [config, setConfig] = useState<PartnerConfig>({
    is_enabled: false,
    share_basis: "contribution_margin",
    tier_period: "calendar_month",
  });
  const [tiers, setTiers] = useState<TierRow[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch("/api/admin/partner-revenue-share");
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to load");
      setOrgType(data.organization?.org_type ?? null);
      setConfig(data.config);
      setTiers(data.tiers?.length ? data.tiers : defaultTiers());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const res = await apiFetch("/api/admin/partner-revenue-share", {
        method: "PATCH",
        body: JSON.stringify({ ...config, tiers }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Save failed");
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      await load();
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
        Loading partner revenue share…
      </div>
    );
  }

  if (orgType && orgType !== "partner") {
    return (
      <p className="text-sm text-muted-foreground max-w-lg">
        Partner revenue share applies to <span className="font-mono">org_type = partner</span>{" "}
        organizations (e.g. Cecconi&apos;s). Switch to a partner org to configure tiers.
      </p>
    );
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h2 className="text-sm font-semibold text-foreground">Partner Revenue Share</h2>
        <p className="text-xs text-muted-foreground mt-1">
          Volume tiers on contribution margin (client net − driver marketplace − Stripe estimate).
          Snapshotted per booking; analytics read from SQL views.
        </p>
      </div>

      <div className="rounded-xl border border-border bg-card p-6 space-y-4">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={config.is_enabled}
            onChange={(e) => setConfig((c) => ({ ...c, is_enabled: e.target.checked }))}
          />
          Enable partner revenue share
        </label>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="text-xs font-medium">Share basis</label>
            <select
              className="mt-1 w-full h-9 rounded-md border border-input bg-background px-2 text-sm"
              value={config.share_basis}
              onChange={(e) => setConfig((c) => ({ ...c, share_basis: e.target.value }))}
            >
              <option value="contribution_margin">Contribution margin</option>
              <option value="client_net">Client net</option>
              <option value="platform_margin">Platform fee</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium">Tier period</label>
            <select
              className="mt-1 w-full h-9 rounded-md border border-input bg-background px-2 text-sm"
              value={config.tier_period}
              onChange={(e) => setConfig((c) => ({ ...c, tier_period: e.target.value }))}
            >
              <option value="calendar_month">Calendar month</option>
              <option value="rolling_30d">Rolling 30 days</option>
            </select>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wide">Volume tiers</h3>
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                setTiers((t) => [
                  ...t,
                  {
                    min_bookings: 1,
                    max_bookings: null,
                    share_percent: 3,
                    sort_order: t.length + 1,
                    is_active: true,
                  },
                ])
              }
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              Add tier
            </Button>
          </div>

          <div className="space-y-2">
            {tiers.map((tier, idx) => (
              <div
                key={tier.id ?? `new-${idx}`}
                className="grid grid-cols-2 sm:grid-cols-4 gap-2 items-end border border-border/60 rounded-lg p-3"
              >
                <Field
                  label="Min bookings"
                  value={tier.min_bookings}
                  onChange={(n) =>
                    setTiers((rows) =>
                      rows.map((r, i) => (i === idx ? { ...r, min_bookings: n } : r))
                    )
                  }
                />
                <Field
                  label="Max bookings"
                  value={tier.max_bookings ?? ""}
                  placeholder="∞"
                  onChange={(n) =>
                    setTiers((rows) =>
                      rows.map((r, i) =>
                        i === idx ? { ...r, max_bookings: Number.isNaN(n) ? null : n } : r
                      )
                    )
                  }
                />
                <Field
                  label="Share %"
                  value={tier.share_percent}
                  onChange={(n) =>
                    setTiers((rows) =>
                      rows.map((r, i) => (i === idx ? { ...r, share_percent: n } : r))
                    )
                  }
                />
                <Field
                  label="Sort"
                  value={tier.sort_order}
                  onChange={(n) =>
                    setTiers((rows) =>
                      rows.map((r, i) => (i === idx ? { ...r, sort_order: n } : r))
                    )
                  }
                />
              </div>
            ))}
          </div>
        </div>

        {error && <p className="text-xs text-destructive">{error}</p>}
        {saved && <p className="text-xs text-emerald-600 font-medium">Saved.</p>}

        <Button size="sm" onClick={() => void handleSave()} disabled={saving}>
          {saving ? <RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Save className="h-3.5 w-3.5 mr-1.5" />}
          Save
        </Button>
      </div>
    </div>
  );
}

function defaultTiers(): TierRow[] {
  return [
    { min_bookings: 1, max_bookings: 10, share_percent: 3, sort_order: 1, is_active: true },
    { min_bookings: 11, max_bookings: 50, share_percent: 5, sort_order: 2, is_active: true },
    { min_bookings: 51, max_bookings: 200, share_percent: 10, sort_order: 3, is_active: true },
  ];
}

function Field({
  label,
  value,
  placeholder,
  onChange,
}: {
  label: string;
  value: number | string;
  placeholder?: string;
  onChange: (n: number) => void;
}) {
  return (
    <div>
      <label className="text-[11px] text-muted-foreground">{label}</label>
      <Input
        type="number"
        className="h-8 mt-0.5"
        placeholder={placeholder}
        value={String(value)}
        onChange={(e) => {
          const raw = e.target.value;
          if (raw === "") {
            onChange(NaN);
            return;
          }
          const n = parseFloat(raw);
          onChange(Number.isNaN(n) ? 0 : n);
        }}
      />
    </div>
  );
}
