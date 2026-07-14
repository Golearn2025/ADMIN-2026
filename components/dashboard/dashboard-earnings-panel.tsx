"use client";

import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";

type OrgEarnings = {
  organization_id: string;
  organization_name: string;
  org_type: string;
  booking_count: number;
  total_client_net_pence: number;
  total_partner_share_pence: number;
  total_vantage_lane_retained_pence: number;
};

type EarningsResponse = {
  scope: string;
  period_month: string;
  platform: {
    total_bookings: number;
    total_client_net_pence: number;
    total_partner_share_pence: number;
    total_vantage_lane_retained_pence: number;
  } | null;
  organizations: OrgEarnings[];
  partner?: {
    partner_earned_pence: number;
    revenue_generated_pence: number;
    booking_count: number;
  };
};

function gbp(pence: number) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(
    (pence || 0) / 100
  );
}

export function DashboardEarningsPanel() {
  const [data, setData] = useState<EarningsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/admin/analytics/earnings");
        if (res.ok) {
          const json = await res.json();
          if (!cancelled) setData(json);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
        <RefreshCw className="h-4 w-4 animate-spin" />
        Loading earnings…
      </div>
    );
  }

  if (!data) return null;

  if (data.scope === "partner" && data.partner) {
    return (
      <div className="rounded-xl border border-border bg-card p-4 space-y-2">
        <h3 className="text-sm font-semibold">Your earnings (this month)</h3>
        <p className="text-2xl font-semibold tabular-nums">{gbp(data.partner.partner_earned_pence)}</p>
        <p className="text-xs text-muted-foreground">
          {data.partner.booking_count} bookings · {gbp(data.partner.revenue_generated_pence)} client
          revenue generated
        </p>
      </div>
    );
  }

  const platform = data.platform;

  return (
    <div className="space-y-4">
      {platform && data.scope === "platform" && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Stat label="Vantage Lane retained" value={gbp(platform.total_vantage_lane_retained_pence)} />
          <Stat label="Partner payouts" value={gbp(platform.total_partner_share_pence)} />
          <Stat label="Client net revenue" value={gbp(platform.total_client_net_pence)} />
        </div>
      )}

      {data.organizations.length > 0 && (
        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-muted/40 text-muted-foreground">
              <tr>
                <th className="text-left p-2 font-medium">Organization</th>
                <th className="text-right p-2 font-medium">Bookings</th>
                <th className="text-right p-2 font-medium">Client net</th>
                <th className="text-right p-2 font-medium">Partner</th>
                <th className="text-right p-2 font-medium">VL retained</th>
              </tr>
            </thead>
            <tbody>
              {data.organizations.map((row) => (
                <tr key={row.organization_id} className="border-t border-border/50">
                  <td className="p-2">{row.organization_name}</td>
                  <td className="p-2 text-right tabular-nums">{row.booking_count}</td>
                  <td className="p-2 text-right tabular-nums">{gbp(row.total_client_net_pence)}</td>
                  <td className="p-2 text-right tabular-nums">{gbp(row.total_partner_share_pence)}</td>
                  <td className="p-2 text-right tabular-nums font-medium">
                    {gbp(row.total_vantage_lane_retained_pence)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold tabular-nums mt-1">{value}</p>
    </div>
  );
}
