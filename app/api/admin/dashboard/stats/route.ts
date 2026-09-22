import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { getCurrentOrg } from "@/lib/auth/org";
import { parseDashboardPeriodQuery } from "@/lib/dashboard/parse-period-query";
import { computeDashboardStats } from "@/lib/dashboard/compute-stats";

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

    let query = supabase.from("admin_booking_list").select("*");

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
      console.error("Dashboard stats error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const stats = computeDashboardStats(bookings ?? []);

    return NextResponse.json({
      ...stats,
      period: periodQuery.isAllTime
        ? { from: null, to: null, all: true }
        : { from: periodQuery.from, to: periodQuery.to, all: false },
    });
  } catch (error) {
    console.error("Dashboard stats exception:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
