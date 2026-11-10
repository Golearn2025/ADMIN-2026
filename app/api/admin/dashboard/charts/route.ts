import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import { getCurrentOrg } from "@/lib/auth/org";
import { parseDashboardPeriodQuery } from "@/lib/dashboard/parse-period-query";
import { bookingTypesFromCounts } from "@/lib/dashboard/booking-types";

export async function GET(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (!user || authError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const currentOrgId = await getCurrentOrg(supabase, user.id);
    const { data: isSuperAdmin } = await supabase.rpc(
      "get_user_super_admin_status",
      { user_id: user.id }
    );

    if (!isSuperAdmin && !currentOrgId) {
      return NextResponse.json(
        { error: "No organization context found" },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(request.url);
    const periodQuery = parseDashboardPeriodQuery(searchParams);
    const orgFilter = currentOrgId ?? null;

    const admin = createAdminClient() ?? supabase;
    const { data, error } = await admin.rpc("admin_dashboard_charts_v1", {
      p_organization_id: orgFilter,
      p_from: periodQuery.isAllTime ? null : periodQuery.from ?? null,
      p_to: periodQuery.isAllTime ? null : periodQuery.to ?? null,
    });

    if (error) {
      console.error("Dashboard charts error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const payload =
      data && typeof data === "object" && !Array.isArray(data)
        ? (data as {
            revenue_trend?: Array<{ date: string; revenue: number }>;
            booking_types_raw?: Record<string, number>;
            payment_status?: Array<{ name: string; value: number }>;
            vehicle_categories?: Array<{ name: string; value: number }>;
          })
        : {};

    return NextResponse.json({
      revenue_trend: payload.revenue_trend ?? [],
      booking_types: bookingTypesFromCounts(payload.booking_types_raw ?? {}),
      payment_status: payload.payment_status ?? [],
      vehicle_categories: payload.vehicle_categories ?? [],
    });
  } catch (error) {
    console.error("Dashboard charts exception:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
