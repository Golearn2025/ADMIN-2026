/**
 * POST /api/admin/jobs/mark-paid
 * Admin bypass: marks booking as CONFIRMED + payment as succeeded
 * without a real Stripe transaction. Job becomes visible to drivers immediately.
 *
 * Body: { bookingId: string, amountPence: number, note?: string }
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const { bookingId, amountPence, note } = await req.json();

    if (!bookingId || amountPence == null) {
      return NextResponse.json(
        { success: false, error: "bookingId and amountPence are required" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Verify booking exists and get org
    const { data: booking, error: bookingErr } = await supabase
      .from("bookings")
      .select("id, status, organization_id, customer_id")
      .eq("id", bookingId)
      .single();

    if (bookingErr || !booking) {
      return NextResponse.json({ success: false, error: "Booking not found" }, { status: 404 });
    }

    // 1. Insert payment record with status = succeeded (cash / admin bypass)
    const { data: payment, error: payErr } = await supabase
      .from("booking_payments")
      .insert({
        booking_id: bookingId,
        amount_pence: amountPence,
        currency: "GBP",
        status: "succeeded",
        organization_id: booking.organization_id,
        payment_kind: "admin_cash",
        metadata: {
          created_by: "admin",
          note: note || "Marked paid by admin",
          bypass: true,
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
    const { error: updateErr } = await supabase
      .from("bookings")
      .update({ status: "CONFIRMED", updated_at: new Date().toISOString() })
      .eq("id", bookingId);

    if (updateErr) {
      return NextResponse.json(
        { success: false, error: `Failed to confirm booking: ${updateErr.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      bookingId,
      paymentId: payment.id,
      message: "Booking confirmed and job published to drivers",
    });
  } catch (err) {
    console.error("[admin/jobs/mark-paid] error:", err);
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
