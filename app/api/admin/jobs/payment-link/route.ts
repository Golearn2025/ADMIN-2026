/**
 * POST /api/admin/jobs/payment-link
 * Calls the pricing backend to create a Stripe payment intent.
 * Returns { clientSecret, paymentIntentId, amount, hostedUrl? }
 *
 * Body: { bookingId: string, customerId: string, email: string, quoteId?: string }
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const BACKEND = (process.env.BACKEND_PROXY_TARGET || "https://pricing.vantage-lane.com").replace(/\/$/, "");

export async function POST(req: NextRequest) {
  try {
    const { bookingId, customerId, email, quoteId } = await req.json();

    if (!bookingId) {
      return NextResponse.json({ success: false, error: "bookingId required" }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const admin = createAdminClient();
    if (!admin) return NextResponse.json({ success: false, error: "Server misconfiguration" }, { status: 500 });

    // Verify booking exists
    const { data: booking, error: bookingErr } = await admin
      .from("bookings")
      .select("id, status, reference")
      .eq("id", bookingId)
      .single();

    if (bookingErr || !booking) {
      return NextResponse.json({ success: false, error: "Booking not found" }, { status: 404 });
    }

    // Call pricing backend to create payment intent
    const upstream = await fetch(`${BACKEND}/api/pricing/create-payment-intent`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        bookingId,
        ...(quoteId && { quoteId }),
        ...(customerId && email && { customerData: { customerId, email } }),
      }),
    });

    const result = await upstream.json().catch(() => ({}));

    if (!upstream.ok) {
      return NextResponse.json(
        { success: false, error: result?.error || "Payment intent creation failed" },
        { status: upstream.status }
      );
    }

    const data = result.success && result.data ? result.data : result;

    // Persist hosted URL in booking_payments if available (for sending to customer)
    if (data.hostedInvoiceUrl || data.hosted_invoice_url) {
      await admin
        .from("booking_payments")
        .update({
          hosted_invoice_url: data.hostedInvoiceUrl || data.hosted_invoice_url,
          updated_at: new Date().toISOString(),
        })
        .eq("booking_id", bookingId)
        .order("created_at", { ascending: false })
        .limit(1);
    }

    return NextResponse.json({
      success: true,
      clientSecret: data.clientSecret,
      paymentIntentId: data.paymentIntentId,
      hostedUrl: data.hostedInvoiceUrl || data.hosted_invoice_url || null,
      amount: data.amount,
      currency: data.currency || "GBP",
      reference: booking.reference,
    });
  } catch (err) {
    console.error("[admin/jobs/payment-link] error:", err);
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
