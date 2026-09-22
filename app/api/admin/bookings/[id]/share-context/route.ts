import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { getCurrentOrg } from "@/lib/auth/org";

export type BookingShareContext = {
  driver_payout_pence: number | null;
  currency: string;
  pickup_lat: number | null;
  pickup_lng: number | null;
  dropoff_lat: number | null;
  dropoff_lng: number | null;
  passenger_count: number | null;
  bag_count: number | null;
  tier_factor?: number | null;
  /** Same as driver jobs list: "EC3R • London" / "Heathrow (LHR) • Hounslow" */
  pickup_preview?: string | null;
  dropoff_preview?: string | null;
  /** Full street addresses for Share Private */
  pickup_address_full?: string | null;
  dropoff_address_full?: string | null;
  customer_name?: string | null;
  customer_phone?: string | null;
};

/**
 * WhatsApp share context:
 * - Live driver offer (trip net × payout tier, e.g. 0.7) via same RPC as driver app
 * - Leg coordinates for map pins
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (!user || authError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const currentOrgId = await getCurrentOrg(supabase, user.id);
    const { data: isSuperAdmin } = await supabase.rpc(
      "get_user_super_admin_status",
      { user_id: user.id }
    );

    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select(
        "id, organization_id, currency, passenger_count, bag_count, trip_configuration_raw, booking_type, customer_id"
      )
      .eq("id", id)
      .is("deleted_at", null)
      .maybeSingle();

    if (bookingError || !booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    if (!isSuperAdmin) {
      if (!currentOrgId || booking.organization_id !== currentOrgId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    } else if (currentOrgId && booking.organization_id !== currentOrgId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data: legs } = await supabase
      .from("booking_legs")
      .select(
        "id, pickup_lat, pickup_lng, dropoff_lat, dropoff_lng, pickup_address, dropoff_address, leg_kind, leg_number, scheduled_at, vehicle_category_id"
      )
      .eq("booking_id", id)
      .is("deleted_at", null)
      .order("leg_number", { ascending: true })
      .limit(5);

    const mainLeg =
      legs?.find((l) => String(l.leg_kind).toLowerCase() === "main") ||
      legs?.[0] ||
      null;

    let driverPayoutPence: number | null = null;
    let tierFactor: number | null = null;

    if (mainLeg?.id && mainLeg.scheduled_at) {
      const { data: liveOffer, error: liveError } = await supabase.rpc(
        "driver_offer_base_payout_for_leg",
        {
          p_leg_id: mainLeg.id,
          p_scheduled_at: mainLeg.scheduled_at,
          p_organization_id: booking.organization_id,
        }
      );

      if (!liveError && liveOffer != null && Number(liveOffer) > 0) {
        driverPayoutPence = Number(liveOffer);
      }

      const { data: factor } = await supabase.rpc("resolve_payout_tier_factor", {
        p_scheduled_at: mainLeg.scheduled_at,
        p_organization_id: booking.organization_id,
        p_tier_group: "trip",
        p_vehicle_category_id: mainLeg.vehicle_category_id || "executive",
      });
      if (factor != null) tierFactor = Number(factor);
    }

    if (driverPayoutPence == null && mainLeg?.id) {
      const { data: legFin } = await supabase
        .from("internal_leg_financials")
        .select(
          "driver_final_payout_pence, driver_estimated_payout_pence, driver_payout_pence, driver_target_payout_pence"
        )
        .eq("booking_leg_id", mainLeg.id)
        .maybeSingle();

      if (legFin) {
        driverPayoutPence =
          legFin.driver_final_payout_pence ??
          legFin.driver_estimated_payout_pence ??
          legFin.driver_payout_pence ??
          legFin.driver_target_payout_pence ??
          null;
      }
    }

    if (driverPayoutPence == null) {
      const { data: bookingFin } = await supabase
        .from("internal_booking_financials")
        .select(
          "driver_final_payout_pence, driver_estimated_payout_pence, driver_payout_pence, driver_target_payout_pence, version"
        )
        .eq("booking_id", id)
        .order("version", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (bookingFin) {
        driverPayoutPence =
          bookingFin.driver_final_payout_pence ??
          bookingFin.driver_estimated_payout_pence ??
          bookingFin.driver_payout_pence ??
          bookingFin.driver_target_payout_pence ??
          null;
      }
    }

    // Same preview as driver Jobs list (format_location_preview from Google Places JSON)
    const trip = (booking.trip_configuration_raw || {}) as Record<string, unknown>;
    const isReturnLeg =
      mainLeg && String(mainLeg.leg_kind).toLowerCase() === "return";

    const pickupLoc = (
      isReturnLeg ? trip.returnPickup || trip.dropoff : trip.pickup
    ) as Record<string, unknown> | string | null | undefined;
    const dropoffLoc = (
      isReturnLeg ? trip.returnDropoff || trip.pickup : trip.dropoff
    ) as Record<string, unknown> | string | null | undefined;

    let pickupPreview: string | null = null;
    let dropoffPreview: string | null = null;

    if (pickupLoc) {
      const { data } = await supabase.rpc("format_location_preview", {
        loc: pickupLoc,
      });
      if (typeof data === "string" && data.trim()) pickupPreview = data.trim();
    }
    if (dropoffLoc) {
      const { data } = await supabase.rpc("format_location_preview", {
        loc: dropoffLoc,
      });
      if (typeof data === "string" && data.trim()) dropoffPreview = data.trim();
    }

    const locFormatted = (loc: unknown): string | null => {
      if (!loc || typeof loc !== "object") return null;
      const o = loc as Record<string, unknown>;
      const raw =
        (typeof o.formatted_address === "string" && o.formatted_address) ||
        (typeof o.address === "string" && o.address) ||
        (typeof o.description === "string" && o.description) ||
        null;
      return raw?.trim() || null;
    };

    const pickupAddressFull =
      locFormatted(pickupLoc) ||
      (typeof mainLeg?.pickup_address === "string"
        ? mainLeg.pickup_address.trim()
        : null) ||
      null;
    const dropoffAddressFull =
      locFormatted(dropoffLoc) ||
      (typeof mainLeg?.dropoff_address === "string"
        ? mainLeg.dropoff_address.trim()
        : null) ||
      null;

    let customerName: string | null = null;
    let customerPhone: string | null = null;
    if (booking.customer_id) {
      const { data: customer } = await supabase
        .from("customers")
        .select("first_name, last_name, phone")
        .eq("id", booking.customer_id)
        .is("deleted_at", null)
        .maybeSingle();
      if (customer) {
        customerName = [customer.first_name, customer.last_name]
          .filter(Boolean)
          .join(" ")
          .trim() || null;
        customerPhone =
          typeof customer.phone === "string" && customer.phone.trim()
            ? customer.phone.trim()
            : null;
      }
    }

    return NextResponse.json({
      driver_payout_pence:
        driverPayoutPence != null ? Number(driverPayoutPence) : null,
      currency: booking.currency || "GBP",
      pickup_lat: mainLeg?.pickup_lat != null ? Number(mainLeg.pickup_lat) : null,
      pickup_lng: mainLeg?.pickup_lng != null ? Number(mainLeg.pickup_lng) : null,
      dropoff_lat:
        mainLeg?.dropoff_lat != null ? Number(mainLeg.dropoff_lat) : null,
      dropoff_lng:
        mainLeg?.dropoff_lng != null ? Number(mainLeg.dropoff_lng) : null,
      passenger_count:
        booking.passenger_count != null ? Number(booking.passenger_count) : null,
      bag_count: booking.bag_count != null ? Number(booking.bag_count) : null,
      tier_factor: tierFactor,
      pickup_preview: pickupPreview,
      dropoff_preview: dropoffPreview,
      pickup_address_full: pickupAddressFull,
      dropoff_address_full: dropoffAddressFull,
      customer_name: customerName,
      customer_phone: customerPhone,
    } satisfies BookingShareContext);
  } catch (error) {
    console.error("[share-context]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
