import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import { getCurrentOrg } from "@/lib/auth/org";
import { parseDashboardPeriodQuery } from "@/lib/dashboard/parse-period-query";

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

    // Super-admin without org context → all orgs (null). Else pin to current org.
    const orgFilter = currentOrgId ?? null;

    const admin = createAdminClient() ?? supabase;
    const { data, error } = await admin.rpc("admin_dashboard_stats_v1", {
      p_organization_id: orgFilter,
      p_from: periodQuery.isAllTime ? null : periodQuery.from ?? null,
      p_to: periodQuery.isAllTime ? null : periodQuery.to ?? null,
    });

    if (error) {
      console.error("Dashboard stats error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const stats =
      data && typeof data === "object" && !Array.isArray(data)
        ? (data as Record<string, unknown>)
        : {};

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
