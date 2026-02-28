"use client";

import { PageHeader } from "@/components/common";
import { BookingTypesChart } from "@/components/dashboard/booking-types-chart";
import { RevenueChart } from "@/components/dashboard/revenue-chart";
import { StatCard } from "@/components/dashboard/stat-card";
import { VehicleCategoriesChart } from "@/components/dashboard/vehicle-categories-chart";
import { Button } from "@/components/ui/button";
import { Calendar, CheckCircle, Clock, DollarSign, TrendingUp } from "lucide-react";
import { useEffect, useState } from "react";

interface DashboardStats {
  total_bookings: number;
  total_revenue_pence: number;
  avg_booking_value_pence: number;
  confirmed_bookings: number;
  cancelled_bookings: number;
  pending_bookings: number;
  scheduled_bookings: number;
  period: string;
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

  const fetchStats = async () => {
    setLoading(true);
    try {
      const [statsRes, chartsRes] = await Promise.all([
        fetch("/api/admin/dashboard/stats"),
        fetch("/api/admin/dashboard/charts"),
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
  }, []);

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
        subtitle="Overview of your business metrics and activity (Last 30 days)"
        actions={
          <Button variant="outline" size="sm" onClick={fetchStats}>
            Refresh Data
          </Button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatCard
          title="Total Revenue"
          value={stats ? formatCurrency(stats.total_revenue_pence) : "—"}
          subtitle="Last 30 days"
          icon={DollarSign}
          loading={loading}
        />

        <StatCard
          title="Total Bookings"
          value={stats?.total_bookings ?? "—"}
          subtitle="Last 30 days"
          icon={Calendar}
          loading={loading}
        />

        <StatCard
          title="Avg Booking Value"
          value={stats ? formatCurrency(stats.avg_booking_value_pence) : "—"}
          subtitle="Per booking"
          icon={TrendingUp}
          loading={loading}
        />

        <StatCard
          title="Confirmed"
          value={stats?.confirmed_bookings ?? "—"}
          subtitle="Completed bookings"
          icon={CheckCircle}
          loading={loading}
        />

        <StatCard
          title="Pending"
          value={stats?.pending_bookings ?? "—"}
          subtitle="Awaiting payment/confirmation"
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

      {/* Revenue Chart - Full Width */}
      <div className="bg-card rounded-lg border border-border p-6 mt-6">
        <h3 className="text-lg font-semibold mb-4">Revenue Trend (Last 30 Days)</h3>
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
