import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const supabase = await createClient();

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoISO = thirtyDaysAgo.toISOString();

    const { data: bookings, error } = await supabase
      .from("admin_booking_list")
      .select("*")
      .gte("created_at", thirtyDaysAgoISO);

    if (error) {
      console.error("Dashboard stats error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const totalBookings = bookings?.length || 0;
    const totalRevenue = bookings?.reduce((sum, b) => sum + (Number(b.display_price_pence) || 0), 0) || 0;
    const avgBookingValue = totalBookings > 0 ? totalRevenue / totalBookings : 0;

    const confirmedBookings = bookings?.filter(b => b.status === "CONFIRMED").length || 0;
    const cancelledBookings = bookings?.filter(b => b.status === "CANCELLED").length || 0;
    const pendingBookings = bookings?.filter(b => b.status === "PENDING_PAYMENT" || b.status === "NEW").length || 0;

    const now = new Date().toISOString();
    const scheduledBookings = bookings?.filter(b => b.start_at && b.start_at > now).length || 0;

    return NextResponse.json({
      total_bookings: totalBookings,
      total_revenue_pence: totalRevenue,
      avg_booking_value_pence: Math.round(avgBookingValue),
      confirmed_bookings: confirmedBookings,
      cancelled_bookings: cancelledBookings,
      pending_bookings: pendingBookings,
      scheduled_bookings: scheduledBookings,
      period: "30d",
    });
  } catch (error) {
    console.error("Dashboard stats exception:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
