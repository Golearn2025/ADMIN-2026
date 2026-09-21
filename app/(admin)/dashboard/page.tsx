"use client";

import { PageHeader } from "@/components/common";
import { BookingTypesChart } from "@/components/dashboard/booking-types-chart";
import { RevenueChart } from "@/components/dashboard/revenue-chart";
import { StatCard } from "@/components/dashboard/stat-card";
import { DashboardEarningsPanel } from "@/components/dashboard/dashboard-earnings-panel";
import { VehicleCategoriesChart } from "@/components/dashboard/vehicle-categories-chart";
import { PeriodSelector } from "@/components/dashboard/period-selector";
import { Button } from "@/components/ui/button";
import { Calendar, CheckCircle, Clock, DollarSign, TrendingUp, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { useDashboardPeriod } from "@/lib/hooks/useDashboardPeriod";

interface DashboardStats {
  total_bookings: number;
  total_revenue_pence: number;
  avg_booking_value_pence: number;
  confirmed_bookings: number;
  cancelled_bookings: number;
  pending_bookings: number;
  scheduled_bookings: number;
  period: {
    from: string;
    to: string;
  };
}

interface DashboardCharts {
  revenue_trend: Array<{ date: string; revenue: number }>;
  booking_types: Array<{ name: string; value: number }>;
  vehicle_categories: Array<{ name: string; value: number }>;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [charts, setCharts] = useState<DashboardCharts | null>(null);
  const [loading, setLoading] = useState(true);
  
  const { period, setPeriod, urlParams, subtitle } = useDashboardPeriod("last30days");

  const fetchStats = async () => {
    setLoading(true);
    try {
      // Build query strings with period params
      const queryString = new URLSearchParams(urlParams).toString();
      const statsUrl = `/api/admin/dashboard/stats${queryString ? `?${queryString}` : ""}`;
      const chartsUrl = `/api/admin/dashboard/charts${queryString ? `?${queryString}` : ""}`;

      const [statsRes, chartsRes] = await Promise.all([
        fetch(statsUrl),
        fetch(chartsUrl),
      ]);

      if (statsRes.ok) {
        const data = await statsRes.json();
        setStats(data);
      }

      if (chartsRes.ok) {
        const data = await chartsRes.json();
        setCharts(data);
      }
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period]);

  const formatCurrency = (pence: number) => {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: "GBP",
    }).format(pence / 100);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        subtitle={subtitle}
        actions={
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
            <PeriodSelector
              value={period}
              onChange={setPeriod}
              className="w-full sm:w-[240px]"
            />
            <Button 
              variant="outline" 
              size="sm" 
              onClick={fetchStats}
              className="gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              <span className="hidden sm:inline">Actualizează</span>
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatCard
          title="Venit total"
          value={stats ? formatCurrency(stats.total_revenue_pence) : "—"}
          subtitle={subtitle}
          icon={DollarSign}
          loading={loading}
        />

        <StatCard
          title="Rezervări totale"
          value={stats?.total_bookings ?? "—"}
          subtitle={subtitle}
          icon={Calendar}
          loading={loading}
        />

        <StatCard
          title="Valoare medie"
          value={stats ? formatCurrency(stats.avg_booking_value_pence) : "—"}
          subtitle="Per rezervare"
          icon={TrendingUp}
          loading={loading}
        />

        <StatCard
          title="Confirmate"
          value={stats?.confirmed_bookings ?? "—"}
          subtitle="Rezervări finalizate"
          icon={CheckCircle}
          loading={loading}
        />

        <StatCard
          title="În așteptare"
          value={stats?.pending_bookings ?? "—"}
          subtitle="Așteptând plată/confirmare"
          icon={Clock}
          loading={loading}
        />

        <StatCard
          title="Programate"
          value={stats?.scheduled_bookings ?? "—"}
          subtitle="Curse viitoare"
          icon={Calendar}
          loading={loading}
        />
      </div>

      <div className="mt-6">
        <h3 className="text-lg font-semibold mb-3">Câștiguri (luna curentă)</h3>
        <DashboardEarningsPanel />
      </div>

      {/* Revenue Chart - Full Width */}
      <div className="bg-card rounded-lg border border-border p-6 mt-6">
        <h3 className="text-lg font-semibold mb-4">Evoluție venit</h3>
        {loading ? (
          <div className="h-[300px] bg-muted animate-pulse rounded"></div>
        ) : charts ? (
          <RevenueChart data={charts.revenue_trend} />
        ) : (
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            Nu există date disponibile
          </div>
        )}
      </div>

      {/* Smaller Charts - 2 Columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        <div className="bg-card rounded-lg border border-border p-6">
          <h3 className="text-base font-semibold mb-4">Tipuri de rezervări</h3>
          {loading ? (
            <div className="h-[300px] bg-muted animate-pulse rounded"></div>
          ) : charts ? (
            <BookingTypesChart data={charts.booking_types} />
          ) : (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground text-sm">
              Nu există date
            </div>
          )}
        </div>

        <div className="bg-card rounded-lg border border-border p-6">
          <h3 className="text-base font-semibold mb-4">Cerere pe categorii</h3>
          {loading ? (
            <div className="h-[250px] bg-muted animate-pulse rounded"></div>
          ) : charts ? (
            <VehicleCategoriesChart data={charts.vehicle_categories} />
          ) : (
            <div className="h-[250px] flex items-center justify-center text-muted-foreground text-sm">
              Nu există date
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
