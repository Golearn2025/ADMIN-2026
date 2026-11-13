/**
 * POST /api/admin/jobs/mark-paid
 * Admin bypass: marks booking as CONFIRMED + payment as succeeded
 * without a real Stripe transaction. Job becomes visible to drivers immediately.
 *
 * Body: {
 *   bookingId, amountPence, note?,
 *   dispatchMode?: 'open' | 'direct',
 *   exclusiveDriverId?: string  // required when dispatchMode=direct
 * }
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { startDirectDispatchRuns } from "@/lib/bookings/start-direct-dispatch";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { bookingId, amountPence, note } = body;
    const dispatchMode =
      body.dispatchMode === "direct" ? "direct" : ("open" as const);
    const exclusiveDriverId =
      typeof body.exclusiveDriverId === "string"
        ? body.exclusiveDriverId.trim()
        : "";

    if (!bookingId || amountPence == null) {
      return NextResponse.json(
        { success: false, error: "bookingId and amountPence are required" },
        { status: 400 }
      );
    }
    if (dispatchMode === "direct" && !exclusiveDriverId) {
      return NextResponse.json(
        { success: false, error: "exclusiveDriverId is required for Direct mode" },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const admin = createAdminClient();
    if (!admin) return NextResponse.json({ success: false, error: "Server misconfiguration" }, { status: 500 });

    // Verify booking exists and get org
    const { data: booking, error: bookingErr } = await admin
      .from("bookings")
      .select("id, status, organization_id, customer_id")
      .eq("id", bookingId)
      .single();

    if (bookingErr || !booking) {
      return NextResponse.json({ success: false, error: "Booking not found" }, { status: 404 });
    }

    // 0. Direct lock BEFORE payment so notify + offer views see exclusive wave
    let directDriverName: string | null = null;
    if (dispatchMode === "direct") {
      const { data: settings } = await admin
        .from("dispatch_org_settings")
        .select("direct_wait_minutes")
        .eq("organization_id", booking.organization_id)
        .maybeSingle();

      const started = await startDirectDispatchRuns({
        admin,
        bookingId,
        organizationId: booking.organization_id,
        exclusiveDriverId,
        createdBy: user.id,
        waitMinutes: settings?.direct_wait_minutes ?? 10,
      });
      if (!started.ok) {
        // No payment / no confirm / no broadcast when Direct lock fails completely
        return NextResponse.json(
          {
            success: false,
            error: started.error,
            bookingId,
            bookingStatus: booking.status,
            dispatchLocked: false,
          },
          { status: 400 }
        );
      }

      // Defense: refuse payment if no active Direct run with exclusive_driver_id
      const { data: directRun } = await admin
        .from("job_dispatch_runs")
        .select("id, exclusive_driver_id, wave")
        .eq("booking_id", bookingId)
        .eq("status", "active")
        .eq("wave", "direct")
        .maybeSingle();
      if (!directRun?.exclusive_driver_id) {
        return NextResponse.json(
          {
            success: false,
            error: "Direct exclusivity was not saved — payment aborted to prevent public broadcast",
            bookingId,
            bookingStatus: booking.status,
            dispatchLocked: false,
          },
          { status: 400 }
        );
      }

      const { data: driver } = await admin
        .from("drivers")
        .select("first_name, last_name")
        .eq("id", exclusiveDriverId)
        .maybeSingle();
      directDriverName = `${driver?.first_name || ""} ${driver?.last_name || ""}`.trim() || "driver";
    }

    // 1. Insert payment record with status = succeeded (cash / admin bypass)
    const { data: payment, error: payErr } = await admin
      .from("booking_payments")
      .insert({
        booking_id: bookingId,
        amount_pence: amountPence,
        currency: "GBP",
        status: "succeeded",
        organization_id: booking.organization_id,
        payment_kind: "manual",
        metadata: {
          created_by: "admin",
          note: note || "Marked paid by admin",
          bypass: true,
          dispatch_mode: dispatchMode,
          exclusive_driver_id: dispatchMode === "direct" ? exclusiveDriverId : null,
        },
        livemode: false,
      })
      .select("id")
      .single();

    if (payErr || !payment) {
      return NextResponse.json(
        { success: false, error: `Failed to insert payment: ${payErr?.message}` },
        { status: 500 }
      );
    }

    // 2. Update booking status → CONFIRMED
    const { error: updateErr } = await admin
      .from("bookings")
      .update({ status: "CONFIRMED", updated_at: new Date().toISOString() })
      .eq("id", bookingId);

    if (updateErr) {
      return NextResponse.json(
        { success: false, error: `Failed to confirm booking: ${updateErr.message}` },
        { status: 500 }
      );
    }

    const message =
      dispatchMode === "direct"
        ? `Job confirmed — reserved for ${directDriverName} only (Direct). Others cannot see it.`
        : "Booking confirmed and job published to drivers";

    return NextResponse.json({
      success: true,
      bookingId,
      paymentId: payment.id,
      dispatchMode,
      exclusiveDriverId: dispatchMode === "direct" ? exclusiveDriverId : null,
      message,
    });
  } catch (err) {
    console.error("[admin/jobs/mark-paid] error:", err);
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
