/**
 * POST /api/admin/jobs/create
 * 1. Find or create customer (email+phone, no auth required)
 * 2. Convert quote to booking via pricing backend
 * Returns { bookingId, reference, customerId }
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const BACKEND = (process.env.BACKEND_PROXY_TARGET || "https://pricing.vantage-lane.com").replace(/\/$/, "");
const DEFAULT_ORG_ID = "9a5caade-4791-4860-93b5-12b1c4fa9830";

async function findOrCreateGuestCustomer(
  supabase: ReturnType<typeof createClient> extends Promise<infer T> ? T : never,
  email: string,
  phone: string,
  firstName: string,
  lastName: string
): Promise<string> {
  // 1. Search by email
  const { data: existing } = await supabase
    .from("customers")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  if (existing) return existing.id;

  // 2. Create guest customer (no auth_user_id needed after migration)
  const { data: created, error } = await supabase
    .from("customers")
    .insert({
      email,
      phone,
      first_name: firstName || "Guest",
      last_name: lastName || "",
      organization_id: DEFAULT_ORG_ID,
      is_active: true,
    })
    .select("id")
    .single();

  if (error || !created) {
    throw new Error(`Failed to create customer: ${error?.message}`);
  }

  return created.id;
}

export async function POST(req: NextRequest) {
  try {
    const {
      quoteId,
      customer,           // { email, phone, firstName, lastName } OR { customerId }
      priceOverride,      // number | null — manual price in pence
    } = await req.json();

    if (!quoteId) {
      return NextResponse.json({ success: false, error: "quoteId is required" }, { status: 400 });
    }
    if (!customer?.email && !customer?.customerId) {
      return NextResponse.json({ success: false, error: "customer email or customerId required" }, { status: 400 });
    }

    const supabase = await createClient();

    // Resolve customer
    let customerId = customer.customerId;
    if (!customerId) {
      customerId = await findOrCreateGuestCustomer(
        supabase,
        customer.email,
        customer.phone || "",
        customer.firstName || "Guest",
        customer.lastName || ""
      );
    }

    // Get customer email for backend call
    const { data: customerRow } = await supabase
      .from("customers")
      .select("email, first_name, last_name")
      .eq("id", customerId)
      .single();

    // Convert quote to booking via pricing backend
    const upstream = await fetch(`${BACKEND}/api/pricing/convert-quote-to-booking`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        quoteId,
        customerData: {
          customerId,
          email: customerRow?.email || customer.email,
          firstName: customerRow?.first_name,
          lastName: customerRow?.last_name,
        },
        ...(priceOverride != null && { priceOverridePence: Math.round(priceOverride * 100) }),
        source: "admin",
      }),
    });

    const result = await upstream.json().catch(() => ({}));

    if (!upstream.ok) {
      return NextResponse.json(
        { success: false, error: result?.error || "Booking creation failed", details: result },
        { status: upstream.status }
      );
    }

    const bookingData = result.success && result.data ? result.data : result;

    return NextResponse.json({
      success: true,
      bookingId: bookingData.bookingId,
      reference: bookingData.reference,
      customerId,
      status: bookingData.status,
    });
  } catch (err) {
    console.error("[admin/jobs/create] error:", err);
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
