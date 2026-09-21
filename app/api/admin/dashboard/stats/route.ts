import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { getCurrentOrg } from "@/lib/auth/org";

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

    // Parse date range from query params
    const { searchParams } = new URL(request.url);
    const fromParam = searchParams.get("from");
    const toParam = searchParams.get("to");

    let fromDate: string;
    let toDate: string;

    if (fromParam && toParam) {
      // Use provided date range
      fromDate = fromParam;
      toDate = toParam;
    } else {
      // Default to last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      fromDate = thirtyDaysAgo.toISOString();
      toDate = new Date().toISOString();
    }

    let query = supabase
      .from("admin_booking_list")
      .select("*")
      .gte("created_at", fromDate)
      .lte("created_at", toDate);

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
      period: {
        from: fromDate,
        to: toDate,
      },
    });
  } catch (error) {
    console.error("Dashboard stats exception:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
