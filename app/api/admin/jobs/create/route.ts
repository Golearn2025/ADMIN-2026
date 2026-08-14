/**
 * POST /api/admin/jobs/create
 * 1. Find or create guest customer (email+phone, no auth required)
 * 2. Call convert_quote_to_booking_atomic RPC directly (bypass backend Node.js)
 *    — the Node.js backend's findOrCreateCustomer tries to insert customer_type/status
 *      columns that don't exist in our schema, so we skip it entirely.
 * Returns { bookingId, reference, customerId }
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const DEFAULT_ORG_ID = "9a5caade-4791-4860-93b5-12b1c4fa9830";

export async function POST(req: NextRequest) {
  try {
    const {
      quoteId,
      customer,       // { email, phone, firstName, lastName } OR { customerId }
      priceOverride,  // number | null — manual price in GBP (not used in RPC, stored separately)
      legDetails,     // Array<{ legNumber, distance, duration }> — from quote response
    } = await req.json();

    if (!quoteId) {
      return NextResponse.json({ success: false, error: "quoteId is required" }, { status: 400 });
    }
    if (!customer?.email && !customer?.customerId) {
      return NextResponse.json({ success: false, error: "customer email or customerId required" }, { status: 400 });
    }

    // Auth check
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    // Service role client — bypasses RLS
    const admin = createAdminClient();
    if (!admin) {
      return NextResponse.json({ success: false, error: "Server misconfiguration: SUPABASE_SERVICE_ROLE_KEY missing" }, { status: 500 });
    }

    // ── Step 1: Resolve customer ──────────────────────────────────────────────
    let customerId: string = customer.customerId;

    if (!customerId) {
      // Search existing by email
      const { data: existing } = await admin
        .from("customers")
        .select("id")
        .eq("email", customer.email)
        .maybeSingle();

      if (existing) {
        customerId = existing.id;
      } else {
        // Create guest customer (auth_user_id is nullable after migration)
        const { data: created, error: createErr } = await admin
          .from("customers")
          .insert({
            email: customer.email,
            phone: customer.phone || "",
            first_name: customer.firstName || "Guest",
            last_name: customer.lastName || "",
            organization_id: DEFAULT_ORG_ID,
            is_active: true,
          })
          .select("id")
          .single();

        if (createErr || !created) {
          return NextResponse.json(
            { success: false, error: `Failed to create customer: ${createErr?.message}` },
            { status: 500 }
          );
        }
        customerId = created.id;
      }
    }

    // ── Step 2: Call RPC directly (no Node.js backend) ───────────────────────
    const { data: rpcResult, error: rpcError } = await admin.rpc(
      "convert_quote_to_booking_atomic",
      {
        p_quote_id: quoteId,
        p_organization_id: DEFAULT_ORG_ID,
        p_customer_id: customerId,
        p_passenger_count: 1,
        p_bag_count: 0,
        p_notes_internal: priceOverride != null
          ? `Admin override price: £${priceOverride}`
          : "Created via admin panel",
      }
    );

    if (rpcError) {
      return NextResponse.json(
        { success: false, error: rpcError.message },
        { status: 500 }
      );
    }

    const result = typeof rpcResult === "object" ? rpcResult : JSON.parse(rpcResult as string);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error_message || "RPC failed" },
        { status: 500 }
      );
    }

    const bookingId: string = result.booking_id;

    // ── Step 3: Fetch reference from booking ─────────────────────────────────
    const { data: booking } = await admin
      .from("bookings")
      .select("reference, status")
      .eq("id", bookingId)
      .single();

    // ── Step 4: Patch distance_miles + duration_min on booking_legs ─────────
    // Critical: driver_offer_base_payout_for_leg() returns 0 without distance
    if (Array.isArray(legDetails) && legDetails.length > 0) {
      for (const leg of legDetails) {
        if (leg.distance != null || leg.duration != null) {
          await admin
            .from("booking_legs")
            .update({
              distance_miles: leg.distance ?? null,
              duration_min: leg.duration != null ? Math.round(leg.duration) : null,
              updated_at: new Date().toISOString(),
            })
            .eq("booking_id", bookingId)
            .eq("leg_number", leg.legNumber ?? 1);
        }
      }
    }

    // ── Step 5: If price override — update billing_snapshot ──────────────────
    if (priceOverride != null) {
      const overridePence = Math.round(priceOverride * 100);
      await admin
        .from("bookings")
        .update({
          billing_snapshot: {
            price_override_pence: overridePence,
            price_override_gbp: priceOverride,
            overridden_by: "admin",
          },
          updated_at: new Date().toISOString(),
        })
        .eq("id", bookingId);
    }

    return NextResponse.json({
      success: true,
      bookingId,
      reference: booking?.reference || null,
      customerId,
      status: booking?.status || result.booking_status,
    });
  } catch (err) {
    console.error("[admin/jobs/create] error:", err);
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
