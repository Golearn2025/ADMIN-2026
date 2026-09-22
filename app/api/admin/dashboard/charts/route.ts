import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { getCurrentOrg } from "@/lib/auth/org";
import { parseDashboardPeriodQuery } from "@/lib/dashboard/parse-period-query";
import { isPaidBooking } from "@/lib/dashboard/compute-stats";
import { aggregateBookingTypes } from "@/lib/dashboard/booking-types";

export async function GET(request: Request) {
  try {
    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (!user || authError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get current organization from database
    const currentOrgId = await getCurrentOrg(supabase, user.id);

    // Check if user is super admin
    const { data: isSuperAdmin } = await supabase
      .rpc('get_user_super_admin_status', { user_id: user.id });

    const { searchParams } = new URL(request.url);
    const periodQuery = parseDashboardPeriodQuery(searchParams);

    let query = supabase
      .from("admin_booking_list")
      .select("*")
      .order("created_at", { ascending: true });

    if (!periodQuery.isAllTime && periodQuery.from && periodQuery.to) {
      query = query
        .gte("start_at", periodQuery.from)
        .lte("start_at", periodQuery.to);
    }

    // Apply organization filtering
    if (isSuperAdmin) {
      if (currentOrgId) {
        query = query.eq("organization_id", currentOrgId);
      }
    } else {
      if (!currentOrgId) {
        return NextResponse.json({ error: "No organization context found" }, { status: 400 });
      }
      query = query.eq("organization_id", currentOrgId);
    }

    const { data: bookings, error } = await query;

    if (error) {
      console.error("Dashboard charts error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // 1. Revenue Trend (daily aggregation)
    const revenueTrend: { date: string; revenue: number }[] = [];
    const dailyRevenue = new Map<string, number>();

    bookings?.forEach((booking) => {
      if (!isPaidBooking(booking)) return;
      const tripDate = booking.start_at || booking.created_at;
      const date = new Date(tripDate).toISOString().split("T")[0];
      const revenue = Number(booking.display_price_pence) || 0;
      dailyRevenue.set(date, (dailyRevenue.get(date) || 0) + revenue);
    });

    dailyRevenue.forEach((revenue, date) => {
      revenueTrend.push({ date, revenue: revenue / 100 }); // Convert to pounds
    });

    const bookingTypes = aggregateBookingTypes(bookings ?? []);

    // 3. Payment Status Distribution
    const paymentsMap = new Map<string, number>();
    bookings?.forEach((booking) => {
      const status = booking.latest_payment_status || "no_payment";
      paymentsMap.set(status, (paymentsMap.get(status) || 0) + 1);
    });

    const paymentStatus = Array.from(paymentsMap.entries()).map(([name, value]) => ({
      name: name.toUpperCase(),
      value,
    }));

    // 4. Vehicle Category Demand
    const vehiclesMap = new Map<string, number>();
    bookings?.forEach((booking) => {
      const category = booking.requested_vehicle_category_label || "Not specified";
      vehiclesMap.set(category, (vehiclesMap.get(category) || 0) + 1);
    });

    const vehicleCategories = Array.from(vehiclesMap.entries()).map(([name, value]) => ({
      name,
      value,
    }));

    return NextResponse.json({
      revenue_trend: revenueTrend,
      booking_types: bookingTypes,
      payment_status: paymentStatus,
      vehicle_categories: vehicleCategories,
    });
  } catch (error) {
    console.error("Dashboard charts exception:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
