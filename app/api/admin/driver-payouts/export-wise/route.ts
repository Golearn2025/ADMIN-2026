/**
 * POST /api/admin/driver-payouts/export-wise
 * Builds a Wise UK batch CSV from SSOT view (full bank details server-side only),
 * then marks lines as exported.
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createTypedAdminClient } from "@/lib/supabase/admin";
import { getCurrentOrg } from "@/lib/auth/org";
import {
  buildWiseUkBatchCsv,
  penceToGbp,
  toWisePayableJob,
  wiseExportFilename,
} from "@/lib/features/driver-payouts";

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
    const weekKey = typeof body.weekKey === "string" ? body.weekKey : null;
    const driverId = typeof body.driverId === "string" ? body.driverId : null;
    const bookingLegIds: string[] | null = Array.isArray(body.bookingLegIds)
      ? body.bookingLegIds
      : null;

    if (!weekKey && !bookingLegIds?.length) {
      return NextResponse.json(
        { error: "weekKey or bookingLegIds required" },
        { status: 400 }
      );
    }

    const admin = createTypedAdminClient();
    if (!admin) {
      return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });
    }

    let query = admin
      .from("admin_driver_payout_jobs_v1")
      .select("*")
      .eq("organization_id", orgId)
      .gt("driver_owed_pence", 0)
      .in("payout_status", ["unpaid", "ready", "exported"]);

    if (weekKey) query = query.eq("week_key", weekKey);
    if (driverId) query = query.eq("driver_id", driverId);
    if (bookingLegIds?.length) query = query.in("booking_leg_id", bookingLegIds);

    const { data, error } = await query;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const jobs = data ?? [];
    const eligible = jobs
      .map(toWisePayableJob)
      .filter((j): j is NonNullable<typeof j> => j != null);

    if (!eligible.length) {
      return NextResponse.json(
        {
          error:
            "No exportable jobs. Drivers need UK bank details and unpaid owed amount > 0.",
          skipped: jobs.length,
        },
        { status: 400 }
      );
    }

    // Aggregate by driver for one Wise row per driver (weekly industry pattern)
    const byDriver = new Map<
      string,
      {
        name: string;
        email: string | null;
        sortCode: string;
        accountNumber: string;
        amountPence: number;
        refs: string[];
        legIds: string[];
        bookingIds: string[];
        weekKey: string;
      }
    >();

    for (const job of eligible) {
      const existing = byDriver.get(job.driver_id);
      if (existing) {
        existing.amountPence += job.driver_owed_pence;
        existing.refs.push(job.booking_reference);
        existing.legIds.push(job.booking_leg_id);
        existing.bookingIds.push(job.booking_id);
      } else {
        byDriver.set(job.driver_id, {
          name: job.account_holder_name || job.driver_name,
          email: job.driver_email,
          sortCode: job.wise_sort_code,
          accountNumber: job.wise_account_number,
          amountPence: job.driver_owed_pence,
          refs: [job.booking_reference],
          legIds: [job.booking_leg_id],
          bookingIds: [job.booking_id],
          weekKey: job.week_key,
        });
      }
    }

    const batchId = `DP-${Date.now().toString(36).toUpperCase()}`;
    const csvRows = Array.from(byDriver.entries()).map(([driverId, row]) => ({
      name: row.name,
      recipientEmail: row.email,
      amountGbp: penceToGbp(row.amountPence),
      sortCode: row.sortCode,
      accountNumber: row.accountNumber,
      reference: `${row.weekKey}-${driverId.slice(0, 4)}`.replace(/[^A-Za-z0-9-]/g, ""),
    }));

    const csv = buildWiseUkBatchCsv(csvRows);
    const filename = wiseExportFilename(
      weekKey || eligible[0].week_key,
      batchId
    );

    const now = new Date().toISOString();
    const markRows = eligible.map((job) => ({
      organization_id: job.organization_id,
      booking_id: job.booking_id,
      booking_leg_id: job.booking_leg_id,
      driver_id: job.driver_id,
      status: "exported" as const,
      export_batch_id: batchId,
      payment_reference: batchId,
      notes: "Exported to Wise batch CSV",
      updated_at: now,
    }));

    const { error: markError } = await admin
      .from("driver_payout_line_marks")
      .upsert(markRows, { onConflict: "booking_leg_id" });

    if (markError) {
      return NextResponse.json({ error: markError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      batchId,
      filename,
      csv,
      drivers: csvRows.length,
      jobs: eligible.length,
      skippedWithoutBank: jobs.length - eligible.length,
      totalGbp: csvRows.reduce((s, r) => s + r.amountGbp, 0),
    });
  } catch (err) {
    console.error("[driver-payouts/export-wise]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
