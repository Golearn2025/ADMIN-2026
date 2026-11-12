/**
 * GET /api/admin/bookings/[id]/ops-context
 * Prefill data for edit trip / vehicle / payment dialogs.
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { utcIsoToLondonLocalInput } from "@/lib/utils/london-datetime";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: bookingId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const admin = createAdminClient();
    if (!admin) return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });

    const { data: booking, error } = await admin
      .from("bookings")
      .select(
        "id, reference, status, organization_id, customer_id, hours_requested, days_requested, notes_internal, custom_requirements, booking_type"
      )
      .eq("id", bookingId)
      .is("deleted_at", null)
      .single();

    if (error || !booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    const { data: legs } = await admin
      .from("booking_legs")
      .select(
        "id, leg_number, leg_kind, status, scheduled_at, pickup_address, pickup_lat, pickup_lng, pickup_place_id, dropoff_address, dropoff_lat, dropoff_lng, dropoff_place_id, flight_number, vehicle_category_id, vehicle_model_id, assigned_driver_id"
      )
      .eq("booking_id", bookingId)
      .is("deleted_at", null)
      .order("leg_number", { ascending: true });

    const main =
      (legs || []).find((l) => String(l.leg_kind).toLowerCase() === "main") ||
      (legs || []).find((l) => l.leg_number === 1) ||
      (legs || [])[0] ||
      null;

    const returnLeg =
      (legs || []).find((l) => String(l.leg_kind).toLowerCase() === "return") || null;

    let customer: {
      id: string;
      email: string | null;
      phone: string | null;
      first_name: string | null;
      last_name: string | null;
      stripe_customer_id: string | null;
    } | null = null;

    if (booking.customer_id) {
      const { data: c } = await admin
        .from("customers")
        .select("id, email, phone, first_name, last_name, stripe_customer_id")
        .eq("id", booking.customer_id)
        .maybeSingle();
      customer = c;
    }

    const { data: latestPayment } = await admin
      .from("booking_payments")
      .select("amount_pence, currency, status, hosted_invoice_url")
      .eq("booking_id", bookingId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    return NextResponse.json({
      booking: {
        id: booking.id,
        reference: booking.reference,
        status: booking.status,
        bookingType: booking.booking_type,
        hoursRequested: booking.hours_requested,
        daysRequested: booking.days_requested,
        notesInternal: booking.notes_internal,
        customRequirements: booking.custom_requirements,
      },
      mainLeg: main
        ? {
            id: main.id,
            scheduledAtLocal: main.scheduled_at
              ? utcIsoToLondonLocalInput(main.scheduled_at)
              : "",
            scheduledAt: main.scheduled_at,
            pickupAddress: main.pickup_address,
            pickupLat: main.pickup_lat,
            pickupLng: main.pickup_lng,
            pickupPlaceId: main.pickup_place_id,
            dropoffAddress: main.dropoff_address,
            dropoffLat: main.dropoff_lat,
            dropoffLng: main.dropoff_lng,
            dropoffPlaceId: main.dropoff_place_id,
            flightNumber: main.flight_number,
            vehicleCategoryId: main.vehicle_category_id,
            vehicleModelId: main.vehicle_model_id,
            assignedDriverId: main.assigned_driver_id,
          }
        : null,
      returnLeg: returnLeg
        ? {
            id: returnLeg.id,
            scheduledAtLocal: returnLeg.scheduled_at
              ? utcIsoToLondonLocalInput(returnLeg.scheduled_at)
              : "",
            scheduledAt: returnLeg.scheduled_at,
          }
        : null,
      customer,
      latestPayment,
    });
  } catch (err) {
    console.error("[ops-context]", err);
    return NextResponse.json({ error: "Failed to load context" }, { status: 500 });
  }
}
