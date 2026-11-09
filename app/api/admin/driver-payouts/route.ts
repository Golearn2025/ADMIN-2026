/**
 * GET /api/admin/driver-payouts
 * SSOT: admin_driver_payout_weekly_v1 + admin_driver_payout_jobs_v1
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createTypedAdminClient } from "@/lib/supabase/admin";
import { getCurrentOrg } from "@/lib/auth/org";
import {
  toDriverPayoutJobDto,
  toDriverPayoutWeeklyDto,
} from "@/lib/features/driver-payouts";

export async function GET(req: NextRequest) {
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
    if (!orgId) {
      return NextResponse.json({ error: "No organization selected" }, { status: 400 });
    }

    const admin = createTypedAdminClient();
    if (!admin) {
      return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });
    }

    const weekKey = req.nextUrl.searchParams.get("weekKey");
    const driverId = req.nextUrl.searchParams.get("driverId");

    let weeklyQuery = admin
      .from("admin_driver_payout_weekly_v1")
      .select("*")
      .eq("organization_id", orgId)
      .order("week_start_london", { ascending: false })
      .order("driver_name", { ascending: true });

    if (weekKey) weeklyQuery = weeklyQuery.eq("week_key", weekKey);

    const { data: weekly, error: weeklyError } = await weeklyQuery;
    if (weeklyError) {
      return NextResponse.json({ error: weeklyError.message }, { status: 500 });
    }

    let jobsQuery = admin
      .from("admin_driver_payout_jobs_v1")
      .select("*")
      .eq("organization_id", orgId)
      .order("settlement_at", { ascending: false });

    if (weekKey) jobsQuery = jobsQuery.eq("week_key", weekKey);
    if (driverId) jobsQuery = jobsQuery.eq("driver_id", driverId);

    const { data: jobs, error: jobsError } = await jobsQuery;
    if (jobsError) {
      return NextResponse.json({ error: jobsError.message }, { status: 500 });
    }

    const weeks = (weekly ?? [])
      .map(toDriverPayoutWeeklyDto)
      .filter((w): w is NonNullable<typeof w> => w != null);
    const jobRows = (jobs ?? [])
      .map(toDriverPayoutJobDto)
      .filter((j): j is NonNullable<typeof j> => j != null);

    const weekOptions = Array.from(
      new Set(weeks.map((w) => w.week_key).filter(Boolean))
    );

    const summary = {
      drivers: new Set(weeks.map((w) => w.driver_id)).size,
      jobs: jobRows.length,
      clientPaidPence: jobRows.reduce((s, j) => s + (j.client_paid_pence || 0), 0),
      driverOwedPence: jobRows.reduce((s, j) => s + (j.driver_owed_pence || 0), 0),
      unpaidJobs: jobRows.filter((j) =>
        j.payout_status === "unpaid" || j.payout_status === "ready"
      ).length,
      missingBankDrivers: new Set(
        weeks.filter((w) => !w.has_uk_bank_details).map((w) => w.driver_id)
      ).size,
    };

    return NextResponse.json({
      weekly: weeks,
      jobs: jobRows,
      weekOptions,
      summary,
    });
  } catch (err) {
    console.error("[driver-payouts GET]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
