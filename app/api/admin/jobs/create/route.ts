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
import { startDirectDispatchRuns } from "@/lib/bookings/start-direct-dispatch";

const DEFAULT_ORG_ID = "9a5caade-4791-4860-93b5-12b1c4fa9830";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      quoteId,
      customer,       // { email, phone, firstName, lastName } OR { customerId }
      priceOverride,  // number | null — manual client price in GBP
      driverPayout,   // number | null — manual driver payout in GBP (what driver sees)
      legDetails,     // Array<{ legNumber, distance, duration }> — from quote response
      passengers,     // number — from admin trip form
      bags,           // number — luggage/bag count from admin trip form
      notes,          // string | null — special requirements → bookings.custom_requirements
      flightNumber,   // string | null — optional flight number
    } = body;
    const dispatchMode = body.dispatchMode === "direct" ? "direct" : "open";
    const exclusiveDriverId =
      typeof body.exclusiveDriverId === "string" ? body.exclusiveDriverId.trim() : "";
    if (dispatchMode === "direct" && !exclusiveDriverId) {
      return NextResponse.json(
        { success: false, error: "exclusiveDriverId is required for Direct mode" },
        { status: 400 }
      );
    }

    const passengerCount = Number.isFinite(Number(passengers))
      ? Math.max(1, Math.round(Number(passengers)))
      : 1;
    const bagCount = Number.isFinite(Number(bags))
      ? Math.max(0, Math.round(Number(bags)))
      : 0;
    const specialRequirements =
      typeof notes === "string" && notes.trim() ? notes.trim() : null;
    const flight =
      typeof flightNumber === "string" && flightNumber.trim()
        ? flightNumber.trim()
        : null;

    const internalNotes = [
      priceOverride != null ? `Admin override price: £${priceOverride}` : null,
      specialRequirements ? `Special requirements: ${specialRequirements}` : null,
      !priceOverride && !specialRequirements ? "Created via admin panel" : null,
    ]
      .filter(Boolean)
      .join(" | ");

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
    // RPC prefers trip_config passengers; bags fall back to p_bag_count when
    // quote meta.luggage is missing (common for admin quotes). Always pass form values.
    const { data: rpcResult, error: rpcError } = await admin.rpc(
      "convert_quote_to_booking_atomic",
      {
        p_quote_id: quoteId,
        p_organization_id: DEFAULT_ORG_ID,
        p_customer_id: customerId,
        p_passenger_count: passengerCount,
        p_bag_count: bagCount,
        p_notes_internal: internalNotes,
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

    // ── Step 2b: Persist bags/notes onto booking columns ─────────────────────
    // RPC writes passenger_count/bag_count/notes_internal, but does NOT map the
    // admin "Special requirements" note into custom_requirements (driver-facing).
    // Also force bag_count from the form — quote meta often omits luggage.
    {
      const bookingPatch: Record<string, unknown> = {
        passenger_count: passengerCount,
        bag_count: bagCount,
        notes_internal: internalNotes,
        updated_at: new Date().toISOString(),
      };
      if (specialRequirements) {
        bookingPatch.custom_requirements = specialRequirements;
      }
      await admin.from("bookings").update(bookingPatch).eq("id", bookingId);

      if (flight) {
        await admin
          .from("booking_legs")
          .update({
            flight_number: flight,
            updated_at: new Date().toISOString(),
          })
          .eq("booking_id", bookingId)
          .eq("leg_number", 1);
      }
    }

    // ── Step 3: Fetch reference from booking ─────────────────────────────────
    const { data: booking } = await admin
      .from("bookings")
      .select("reference, status")
      .eq("id", bookingId)
      .single();

    // ── Step 4: Patch distance_miles + duration_min on booking_legs ─────────
    // The quote response uses distance_miles / duration_min inside pricing.legs.
    // Older admin payloads used distance / duration. If neither arrives, copy the
    // quote totals so the driver app is not left with an empty route.
    const quotedLegs = Array.isArray(legDetails) ? legDetails : [];
    let wroteRoute = false;
    for (const leg of quotedLegs) {
      const milesRaw = leg.distance ?? leg.distance_miles;
      const minsRaw = leg.duration ?? leg.duration_min;
      const miles = milesRaw == null || milesRaw === "" ? null : Number(milesRaw);
      const mins = minsRaw == null || minsRaw === "" ? null : Math.round(Number(minsRaw));
      if (!Number.isFinite(miles as number) && !Number.isFinite(mins as number)) continue;
      await admin
        .from("booking_legs")
        .update({
          distance_miles: Number.isFinite(miles as number) ? miles : null,
          duration_min: Number.isFinite(mins as number) ? mins : null,
          updated_at: new Date().toISOString(),
        })
        .eq("booking_id", bookingId)
        .eq("leg_number", leg.legNumber ?? leg.leg_number ?? 1);
      wroteRoute = true;
    }

    if (!wroteRoute) {
      const { data: quote } = await admin
        .from("client_booking_quotes")
        .select("total_distance_miles, total_duration_minutes")
        .eq("id", quoteId)
        .maybeSingle();
      const miles = quote?.total_distance_miles == null ? null : Number(quote.total_distance_miles);
      const mins = quote?.total_duration_minutes == null ? null : Math.round(Number(quote.total_duration_minutes));
      if (Number.isFinite(miles as number) || Number.isFinite(mins as number)) {
        await admin
          .from("booking_legs")
          .update({
            distance_miles: Number.isFinite(miles as number) ? miles : null,
            duration_min: Number.isFinite(mins as number) ? mins : null,
            updated_at: new Date().toISOString(),
          })
          .eq("booking_id", bookingId)
          .eq("leg_number", 1);
      }
    }

    // ── Step 5: Insert internal_leg_financials so driver sees correct payout ──
    // driver_offer_base_payout_for_leg() reads from this table
    if (driverPayout != null) {
      const driverPayoutPence = Math.round(driverPayout * 100);
      const { data: legs } = await admin
        .from("booking_legs")
        .select("id, vehicle_category_id")
        .eq("booking_id", bookingId);

      if (legs && legs.length > 0) {
        for (const leg of legs) {
          await admin.from("internal_leg_financials").insert({
            booking_leg_id: leg.id,
            booking_id: bookingId,
            version: 1,
            currency: "GBP",
            driver_payout_pence: driverPayoutPence,
            driver_final_payout_pence: driverPayoutPence,
            driver_estimated_payout_pence: driverPayoutPence,
            driver_base_payout_pence: driverPayoutPence,
            driver_target_payout_pence: driverPayoutPence,
            driver_pricing_factor_used: 1.0,
            platform_fee_pence: 0,
            operator_fee_pence: 0,
            vendor_cost_pence: 0,
            vehicle_category_id: leg.vehicle_category_id,
            line_items: { admin_override: true, driver_payout_gbp: driverPayout },
          });
        }
      }
    }

    // ── Step 6: If client price override — update billing_snapshot ────────────
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

    // Direct: lock legs before payment so Stripe/mark-paid notify only that driver
    if (dispatchMode === "direct") {
      const { data: settings } = await admin
        .from("dispatch_org_settings")
        .select("direct_wait_minutes")
        .eq("organization_id", DEFAULT_ORG_ID)
        .maybeSingle();

      const started = await startDirectDispatchRuns({
        admin,
        bookingId,
        organizationId: DEFAULT_ORG_ID,
        exclusiveDriverId,
        createdBy: user.id,
        waitMinutes: settings?.direct_wait_minutes ?? 10,
      });
      if (!started.ok) {
        return NextResponse.json(
          {
            success: false,
            error: `Booking created (${booking?.reference || bookingId}) but Direct lock failed: ${started.error}`,
            bookingId,
            reference: booking?.reference || null,
          },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      bookingId,
      reference: booking?.reference || null,
      customerId,
      status: booking?.status || result.booking_status,
      dispatchMode,
      exclusiveDriverId: dispatchMode === "direct" ? exclusiveDriverId : null,
    });
  } catch (err) {
    console.error("[admin/jobs/create] error:", err);
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
