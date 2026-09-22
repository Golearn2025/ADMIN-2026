"use client";

import { PageHeader } from "@/components/common";
import { BookingTypesChart } from "@/components/dashboard/booking-types-chart";
import { RevenueChart } from "@/components/dashboard/revenue-chart";
import { StatCard } from "@/components/dashboard/stat-card";
import { DashboardEarningsPanel } from "@/components/dashboard/dashboard-earnings-panel";
import { VehicleCategoriesChart } from "@/components/dashboard/vehicle-categories-chart";
import { PeriodSelector } from "@/components/dashboard/period-selector";
import { OpsCoverageCards } from "@/components/dashboard/ops-coverage-cards";
import { Button } from "@/components/ui/button";
import { Calendar, CheckCircle, Clock, PoundSterling, TrendingUp, RefreshCw } from "lucide-react";
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
  incoming_bookings: number;
  incoming_value_pence: number;
  completed_bookings: number;
  in_progress_bookings: number;
  assigned_bookings: number;
  unassigned_bookings: number;
  period: {
    from: string | null;
    to: string | null;
    all: boolean;
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
  
  const { period, setPeriod, urlParams, subtitle } = useDashboardPeriod("today");

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
  }, [period.preset, period.customRange]);

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
        subtitle={`${subtitle} · filtered by trip date`}
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
              <span className="hidden sm:inline">Refresh</span>
            </Button>
          </div>
        }
      />

      <OpsCoverageCards
        title={period.preset === "today" ? "Today's jobs" : "Jobs in this period"}
        incoming={stats?.incoming_bookings ?? 0}
        incomingValue={stats ? formatCurrency(stats.incoming_value_pence) : "—"}
        completed={stats?.completed_bookings ?? 0}
        inProgress={stats?.in_progress_bookings ?? 0}
        unassigned={stats?.unassigned_bookings ?? 0}
        loading={loading}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatCard
          title="Total Revenue"
          value={stats ? formatCurrency(stats.total_revenue_pence) : "—"}
          subtitle="Collected payments"
          icon={PoundSterling}
          loading={loading}
        />

        <StatCard
          title="Total Bookings"
          value={stats?.total_bookings ?? "—"}
          subtitle="Excluding cancelled"
          icon={Calendar}
          loading={loading}
        />

        <StatCard
          title="Avg Booking Value"
          value={stats ? formatCurrency(stats.avg_booking_value_pence) : "—"}
          subtitle="Per paid booking"
          icon={TrendingUp}
          loading={loading}
        />

        <StatCard
          title="Confirmed"
          value={stats?.confirmed_bookings ?? "—"}
          subtitle="Confirmed and completed"
          icon={CheckCircle}
          loading={loading}
        />

        <StatCard
          title="Pending"
          value={stats?.pending_bookings ?? "—"}
          subtitle="Payment or invoice pending"
          icon={Clock}
          loading={loading}
        />

        <StatCard
          title="Scheduled"
          value={stats?.scheduled_bookings ?? "—"}
          subtitle="Upcoming trips"
          icon={Calendar}
          loading={loading}
        />
      </div>

      <div className="mt-6">
        <h3 className="text-lg font-semibold mb-3">Earnings (this month)</h3>
        <DashboardEarningsPanel />
      </div>

      {/* Revenue Chart - Full Width */}
      <div className="bg-card rounded-lg border border-border p-6 mt-6">
        <h3 className="text-lg font-semibold mb-4">Revenue Trend</h3>
        {loading ? (
          <div className="h-[300px] bg-muted animate-pulse rounded"></div>
        ) : charts ? (
          <RevenueChart data={charts.revenue_trend} />
        ) : (
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            No data available
          </div>
        )}
      </div>

      {/* Smaller Charts - 2 Columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        <div className="bg-card rounded-lg border border-border p-6">
          <h3 className="text-base font-semibold mb-4">Booking Types</h3>
          {loading ? (
            <div className="h-[300px] bg-muted animate-pulse rounded"></div>
          ) : charts ? (
            <BookingTypesChart data={charts.booking_types} />
          ) : (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground text-sm">
              No data
            </div>
          )}
        </div>

        <div className="bg-card rounded-lg border border-border p-6">
          <h3 className="text-base font-semibold mb-4">Vehicle Demand</h3>
          {loading ? (
            <div className="h-[250px] bg-muted animate-pulse rounded"></div>
          ) : charts ? (
            <VehicleCategoriesChart data={charts.vehicle_categories} />
          ) : (
            <div className="h-[250px] flex items-center justify-center text-muted-foreground text-sm">
              No data
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
