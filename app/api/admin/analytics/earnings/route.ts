import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrg } from "@/lib/auth/org";
import { createAdminClient } from "@/lib/supabase/admin";

function currentPeriodMonth(): string {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-01`;
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (!user || authError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const orgId = await getCurrentOrg(supabase, user.id);
    const { data: isSuperAdmin } = await supabase.rpc("get_user_super_admin_status", {
      user_id: user.id,
    });

    const period = request.nextUrl.searchParams.get("period") || currentPeriodMonth();
    const db = createAdminClient() ?? supabase;

    const { data: orgRow } = orgId
      ? await db.from("organizations").select("org_type").eq("id", orgId).maybeSingle()
      : { data: null };

    const isPartnerUser = orgRow?.org_type === "partner" && !isSuperAdmin;

    if (isPartnerUser && orgId) {
      const { data, error } = await db
        .from("partner_org_earnings_v1")
        .select("*")
        .eq("organization_id", orgId)
        .eq("period_month", period)
        .maybeSingle();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({
        scope: "partner",
        period_month: period,
        partner: data,
      });
    }

    let orgQuery = db.from("admin_org_earnings_summary_v1").select("*").eq("period_month", period);
    if (orgId) {
      orgQuery = orgQuery.eq("organization_id", orgId);
    }

    const [{ data: byOrg, error: orgError }, { data: platform, error: platformError }] =
      await Promise.all([
        orgQuery.order("organization_name"),
        db.from("admin_platform_earnings_v1").select("*").eq("period_month", period).maybeSingle(),
      ]);

    if (orgError) {
      return NextResponse.json({ error: orgError.message }, { status: 500 });
    }
    if (platformError) {
      return NextResponse.json({ error: platformError.message }, { status: 500 });
    }

    return NextResponse.json({
      scope: orgId ? "organization" : "platform",
      period_month: period,
      platform: platform ?? null,
      organizations: byOrg ?? [],
    });
  } catch (error) {
    console.error("analytics/earnings GET:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
