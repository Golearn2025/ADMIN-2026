"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CreditCard, RefreshCw, Users } from "lucide-react";
import { PageHeader } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type EarningsResponse = {
  scope: string;
  period_month: string;
  platform: {
    total_bookings: number;
    total_client_net_pence: number;
    total_partner_share_pence: number;
    total_vantage_lane_retained_pence: number;
  } | null;
  organizations: Array<{
    organization_id: string;
    organization_name: string;
    booking_count: number;
    total_client_net_pence: number;
    total_partner_share_pence: number;
    total_vantage_lane_retained_pence: number;
  }>;
  partner?: {
    partner_earned_pence: number;
    revenue_generated_pence: number;
    booking_count: number;
  };
};

function gbp(pence: number) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
  }).format((pence || 0) / 100);
}

export default function BillingPage() {
  const [data, setData] = useState<EarningsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/admin/analytics/earnings");
        const json = await res.json();
        if (!res.ok) {
          if (!cancelled) setError(json.error || "Failed to load earnings");
          return;
        }
        if (!cancelled) setData(json);
      } catch {
        if (!cancelled) setError("Failed to load earnings");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const orgTotals = data?.organizations?.reduce(
    (acc, row) => ({
      bookings: acc.bookings + (row.booking_count || 0),
      clientNet: acc.clientNet + (row.total_client_net_pence || 0),
      partner: acc.partner + (row.total_partner_share_pence || 0),
      retained: acc.retained + (row.total_vantage_lane_retained_pence || 0),
    }),
    { bookings: 0, clientNet: 0, partner: 0, retained: 0 }
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Billing"
        subtitle="Customer invoices and billing information"
        actions={
          <Button size="sm" disabled>
            Create Invoice
          </Button>
        }
      />

      <div className="space-y-4 px-3 sm:px-4 md:px-6 md:space-y-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <CreditCard className="h-5 w-5" />
              Earnings summary
            </CardTitle>
            {data?.period_month && (
              <span className="text-xs text-muted-foreground">
                Period {data.period_month.slice(0, 7)}
              </span>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {loading && (
              <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
                <RefreshCw className="h-4 w-4 animate-spin" />
                Loading earnings…
              </div>
            )}

            {!loading && error && (
              <p className="py-4 text-sm text-destructive">{error}</p>
            )}

            {!loading && !error && data?.scope === "partner" && data.partner && (
              <div className="grid gap-3 sm:grid-cols-3">
                <Stat
                  label="Your earnings"
                  value={gbp(data.partner.partner_earned_pence)}
                />
                <Stat
                  label="Client revenue"
                  value={gbp(data.partner.revenue_generated_pence)}
                />
                <Stat
                  label="Bookings"
                  value={String(data.partner.booking_count)}
                />
              </div>
            )}

            {!loading && !error && data && data.scope !== "partner" && (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Stat
                  label="Client net"
                  value={gbp(
                    data.platform?.total_client_net_pence ??
                      orgTotals?.clientNet ??
                      0
                  )}
                />
                <Stat
                  label="Partner payouts"
                  value={gbp(
                    data.platform?.total_partner_share_pence ??
                      orgTotals?.partner ??
                      0
                  )}
                />
                <Stat
                  label="VL retained"
                  value={gbp(
                    data.platform?.total_vantage_lane_retained_pence ??
                      orgTotals?.retained ??
                      0
                  )}
                />
                <Stat
                  label="Bookings"
                  value={String(
                    data.platform?.total_bookings ?? orgTotals?.bookings ?? 0
                  )}
                />
              </div>
            )}

            <p className="text-sm text-muted-foreground">
              Invoice management is next. For now, review customer accounts and
              current-period earnings above.
            </p>

            <Button asChild variant="outline" size="sm">
              <Link href="/customers">
                <Users className="mr-2 h-4 w-4" />
                Go to customers
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-muted/30 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums">{value}</p>
    </div>
  );
}
