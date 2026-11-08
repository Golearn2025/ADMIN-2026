/**
 * POST /api/admin/driver-payouts/mark
 * Upsert payout lifecycle on driver_payout_line_marks for selected booking legs.
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentOrg } from "@/lib/auth/org";
import type { DriverPayoutStatus } from "@/lib/features/driver-payouts";

const ALLOWED: DriverPayoutStatus[] = [
  "unpaid",
  "ready",
  "exported",
  "paid",
  "skipped",
];

export async function POST(req: NextRequest) {
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

    const body = await req.json();
    const bookingLegIds: string[] = Array.isArray(body.bookingLegIds)
      ? body.bookingLegIds
      : [];
    const status = body.status as DriverPayoutStatus;
    const paymentReference =
      typeof body.paymentReference === "string" ? body.paymentReference.trim() : null;
    const exportBatchId =
      typeof body.exportBatchId === "string" ? body.exportBatchId.trim() : null;
    const notes = typeof body.notes === "string" ? body.notes.trim() : null;

    if (!bookingLegIds.length) {
      return NextResponse.json({ error: "bookingLegIds required" }, { status: 400 });
    }
    if (!ALLOWED.includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const admin = createAdminClient();
    if (!admin) {
      return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });
    }

    const { data: jobs, error: jobsError } = await admin
      .from("admin_driver_payout_jobs_v1")
      .select(
        "booking_leg_id, booking_id, driver_id, organization_id"
      )
      .eq("organization_id", orgId)
      .in("booking_leg_id", bookingLegIds);

    if (jobsError) {
      return NextResponse.json({ error: jobsError.message }, { status: 500 });
    }
    if (!jobs?.length) {
      return NextResponse.json({ error: "No matching jobs" }, { status: 404 });
    }

    const now = new Date().toISOString();
    const rows = jobs.map((job) => ({
      organization_id: job.organization_id,
      booking_id: job.booking_id,
      booking_leg_id: job.booking_leg_id,
      driver_id: job.driver_id,
      status,
      paid_at: status === "paid" ? now : null,
      paid_by_auth_user_id: status === "paid" ? user.id : null,
      payment_reference: paymentReference,
      export_batch_id: exportBatchId,
      notes,
      updated_at: now,
    }));

    const { error: upsertError } = await admin
      .from("driver_payout_line_marks")
      .upsert(rows, { onConflict: "booking_leg_id" });

    if (upsertError) {
      return NextResponse.json({ error: upsertError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      updated: rows.length,
      status,
    });
  } catch (err) {
    console.error("[driver-payouts/mark]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
