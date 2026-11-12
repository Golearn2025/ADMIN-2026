/**
 * POST /api/admin/bookings/[id]/ops
 * Admin ops SSOT: assign | unassign | status | cancel | edit_trip | edit_vehicle |
 * add_note | mark_paid | payment_link | extra_charge
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ADMIN_STATUS_OPTIONS } from "@/lib/bookings/admin-ops";
import { logBookingAdminActivity } from "@/lib/bookings/log-admin-activity";
import { createStripeAddonInvoice } from "@/lib/bookings/create-stripe-addon-invoice";
import { londonLocalToUtcIso } from "@/lib/utils/london-datetime";

const OPS_ACTIONS = [
  "assign",
  "unassign",
  "status",
  "cancel",
  "edit_trip",
  "edit_vehicle",
  "add_note",
  "mark_paid",
  "payment_link",
  "extra_charge",
] as const;

type OpsAction = (typeof OPS_ACTIONS)[number];

const BACKEND = (process.env.BACKEND_PROXY_TARGET || "https://pricing.vantage-lane.com").replace(
  /\/$/,
  ""
);

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: bookingId } = await params;
    const body = await req.json().catch(() => ({}));
    const action = body.action as OpsAction;
    const reasonCode = typeof body.reasonCode === "string" ? body.reasonCode.trim() : "";
    const reasonText = typeof body.reasonText === "string" ? body.reasonText.trim() : "";

    if (!action || !OPS_ACTIONS.includes(action)) {
      return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 });
    }
    if (!reasonCode) {
      return NextResponse.json({ success: false, error: "reasonCode is required" }, { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const admin = createAdminClient();
    if (!admin) {
      return NextResponse.json(
        { success: false, error: "Server misconfiguration: SUPABASE_SERVICE_ROLE_KEY missing" },
        { status: 500 }
      );
    }

    const { data: booking, error: bookingErr } = await admin
      .from("bookings")
      .select(
        "id, reference, status, organization_id, customer_id, hours_requested, days_requested, notes_internal, booking_type"
      )
      .eq("id", bookingId)
      .is("deleted_at", null)
      .single();

    if (bookingErr || !booking) {
      return NextResponse.json({ success: false, error: "Booking not found" }, { status: 404 });
    }

    const actor = {
      actorUserId: user.id,
      actorEmail: user.email ?? null,
      actorName:
        (user.user_metadata?.full_name as string | undefined) ||
        (user.user_metadata?.name as string | undefined) ||
        user.email ||
        null,
    };

    const { data: legs } = await admin
      .from("booking_legs")
      .select(
        "id, leg_number, leg_kind, status, assigned_driver_id, assigned_vehicle_id, scheduled_at, pickup_address, dropoff_address, flight_number, vehicle_category_id, vehicle_model_id, pickup_lat, pickup_lng, dropoff_lat, dropoff_lng"
      )
      .eq("booking_id", bookingId)
      .is("deleted_at", null)
      .order("leg_number", { ascending: true });

    const mainLeg =
      (legs || []).find((l) => String(l.leg_kind).toLowerCase() === "main") ||
      (legs || []).find((l) => l.leg_number === 1) ||
      (legs || [])[0] ||
      null;

    if (action === "assign") {
      const driverId = typeof body.driverId === "string" ? body.driverId : "";
      if (!driverId) {
        return NextResponse.json({ success: false, error: "driverId is required" }, { status: 400 });
      }
      if (booking.status === "CANCELLED") {
        return NextResponse.json(
          { success: false, error: "Cannot assign driver on a cancelled booking" },
          { status: 400 }
        );
      }

      const { data: driver, error: driverErr } = await admin
        .from("drivers")
        .select("id, first_name, last_name, phone, status")
        .eq("id", driverId)
        .is("deleted_at", null)
        .maybeSingle();

      if (driverErr || !driver) {
        return NextResponse.json({ success: false, error: "Driver not found" }, { status: 404 });
      }

      const { data: vehicle } = await admin
        .from("vehicles")
        .select("id, plate, make, model")
        .eq("driver_id", driverId)
        .eq("status", "active")
        .is("deleted_at", null)
        .limit(1)
        .maybeSingle();

      const fromDriverId = mainLeg?.assigned_driver_id ?? null;
      const actionType = fromDriverId && fromDriverId !== driverId ? "driver_reassign" : "driver_assign";

      // Assign on all non-cancelled legs (fleet/return stay consistent for Phase A)
      for (const leg of legs || []) {
        if (String(leg.status).toUpperCase() === "CANCELLED") continue;
        await admin
          .from("booking_legs")
          .update({
            assigned_driver_id: driverId,
            assigned_vehicle_id: vehicle?.id ?? leg.assigned_vehicle_id ?? null,
            status: "ASSIGNED",
            updated_at: new Date().toISOString(),
          })
          .eq("id", leg.id);
      }

      await logBookingAdminActivity(admin, {
        bookingId,
        bookingLegId: mainLeg?.id ?? null,
        organizationId: booking.organization_id,
        actionType,
        reasonCode,
        reasonText: reasonText || null,
        fromValue: { driverId: fromDriverId },
        toValue: {
          driverId,
          driverName: `${driver.first_name || ""} ${driver.last_name || ""}`.trim(),
          vehicleId: vehicle?.id ?? null,
          vehiclePlate: vehicle?.plate ?? null,
        },
        ...actor,
      });

      return NextResponse.json({
        success: true,
        action: actionType,
        driver: {
          id: driver.id,
          name: `${driver.first_name || ""} ${driver.last_name || ""}`.trim(),
          phone: driver.phone,
        },
      });
    }

    if (action === "unassign") {
      const fromDriverId = mainLeg?.assigned_driver_id ?? null;
      if (!fromDriverId) {
        return NextResponse.json({ success: false, error: "No driver assigned" }, { status: 400 });
      }

      for (const leg of legs || []) {
        if (String(leg.status).toUpperCase() === "CANCELLED") continue;
        await admin
          .from("booking_legs")
          .update({
            assigned_driver_id: null,
            assigned_vehicle_id: null,
            status: "PENDING",
            updated_at: new Date().toISOString(),
          })
          .eq("id", leg.id);
      }

      await logBookingAdminActivity(admin, {
        bookingId,
        bookingLegId: mainLeg?.id ?? null,
        organizationId: booking.organization_id,
        actionType: "driver_unassign",
        reasonCode,
        reasonText: reasonText || null,
        fromValue: { driverId: fromDriverId },
        toValue: { driverId: null },
        ...actor,
      });

      return NextResponse.json({ success: true, action: "driver_unassign" });
    }

    if (action === "status") {
      const nextStatus = typeof body.status === "string" ? body.status.trim().toUpperCase() : "";
      if (!ADMIN_STATUS_OPTIONS.includes(nextStatus as (typeof ADMIN_STATUS_OPTIONS)[number])) {
        return NextResponse.json({ success: false, error: "Invalid status" }, { status: 400 });
      }
      if (booking.status === nextStatus) {
        return NextResponse.json({ success: false, error: "Status is already set" }, { status: 400 });
      }

      await admin
        .from("bookings")
        .update({
          status: nextStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", bookingId);

      // Keep legs in sync for terminal states
      if (nextStatus === "CANCELLED") {
        await admin
          .from("booking_legs")
          .update({ status: "CANCELLED", updated_at: new Date().toISOString() })
          .eq("booking_id", bookingId)
          .is("deleted_at", null);
      } else if (nextStatus === "COMPLETED") {
        await admin
          .from("booking_legs")
          .update({ status: "COMPLETED", updated_at: new Date().toISOString() })
          .eq("booking_id", bookingId)
          .is("deleted_at", null)
          .neq("status", "CANCELLED");
      } else if (nextStatus === "CONFIRMED" || nextStatus === "IN_PROGRESS") {
        // Leg enum: PENDING | ASSIGNED | COMPLETED | CANCELLED (no IN_PROGRESS)
        await admin
          .from("booking_legs")
          .update({
            status: mainLeg?.assigned_driver_id ? "ASSIGNED" : "PENDING",
            updated_at: new Date().toISOString(),
          })
          .eq("booking_id", bookingId)
          .is("deleted_at", null)
          .neq("status", "CANCELLED");
      }

      await logBookingAdminActivity(admin, {
        bookingId,
        bookingLegId: mainLeg?.id ?? null,
        organizationId: booking.organization_id,
        actionType: nextStatus === "CANCELLED" ? "cancel" : "status_change",
        reasonCode,
        reasonText: reasonText || null,
        fromValue: { status: booking.status },
        toValue: { status: nextStatus },
        ...actor,
      });

      return NextResponse.json({
        success: true,
        action: nextStatus === "CANCELLED" ? "cancel" : "status_change",
        status: nextStatus,
      });
    }

    if (action === "edit_trip") {
      if (!mainLeg) {
        return NextResponse.json({ success: false, error: "No leg to edit" }, { status: 400 });
      }
      const scheduledLocal =
        typeof body.scheduledAtLocal === "string" ? body.scheduledAtLocal.trim() : "";
      const returnLocal =
        typeof body.returnAtLocal === "string" ? body.returnAtLocal.trim() : "";
      const pickupAddress =
        typeof body.pickupAddress === "string" ? body.pickupAddress.trim() : undefined;
      const dropoffAddress =
        typeof body.dropoffAddress === "string" ? body.dropoffAddress.trim() : undefined;
      const flightNumber =
        typeof body.flightNumber === "string" ? body.flightNumber.trim() : undefined;
      const hours =
        body.hoursRequested != null && body.hoursRequested !== ""
          ? Number(body.hoursRequested)
          : undefined;
      const days =
        body.daysRequested != null && body.daysRequested !== ""
          ? Number(body.daysRequested)
          : undefined;

      const fromValue = {
        scheduledAt: mainLeg.scheduled_at,
        pickupAddress: mainLeg.pickup_address,
        pickupLat: mainLeg.pickup_lat,
        pickupLng: mainLeg.pickup_lng,
        dropoffAddress: mainLeg.dropoff_address,
        dropoffLat: mainLeg.dropoff_lat,
        dropoffLng: mainLeg.dropoff_lng,
        flightNumber: mainLeg.flight_number,
        hoursRequested: booking.hours_requested,
        daysRequested: booking.days_requested,
      };

      const legPatch: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (scheduledLocal) legPatch.scheduled_at = londonLocalToUtcIso(scheduledLocal);
      if (pickupAddress !== undefined) {
        legPatch.pickup_address = pickupAddress || null;
        if (body.pickupLat != null && body.pickupLng != null) {
          legPatch.pickup_lat = Number(body.pickupLat);
          legPatch.pickup_lng = Number(body.pickupLng);
        } else if (!pickupAddress) {
          legPatch.pickup_lat = null;
          legPatch.pickup_lng = null;
        }
        if (typeof body.pickupPlaceId === "string") {
          legPatch.pickup_place_id = body.pickupPlaceId.trim() || null;
        } else if (!pickupAddress) {
          legPatch.pickup_place_id = null;
        }
      }
      if (dropoffAddress !== undefined) {
        legPatch.dropoff_address = dropoffAddress || null;
        if (body.dropoffLat != null && body.dropoffLng != null) {
          legPatch.dropoff_lat = Number(body.dropoffLat);
          legPatch.dropoff_lng = Number(body.dropoffLng);
        } else if (!dropoffAddress) {
          legPatch.dropoff_lat = null;
          legPatch.dropoff_lng = null;
        }
        if (typeof body.dropoffPlaceId === "string") {
          legPatch.dropoff_place_id = body.dropoffPlaceId.trim() || null;
        } else if (!dropoffAddress) {
          legPatch.dropoff_place_id = null;
        }
      }
      if (flightNumber !== undefined) {
        legPatch.flight_number = flightNumber || null;
      }

      await admin.from("booking_legs").update(legPatch).eq("id", mainLeg.id);

      const returnLeg = (legs || []).find(
        (l) => String(l.leg_kind).toLowerCase() === "return"
      );
      if (returnLeg && returnLocal) {
        await admin
          .from("booking_legs")
          .update({
            scheduled_at: londonLocalToUtcIso(returnLocal),
            updated_at: new Date().toISOString(),
          })
          .eq("id", returnLeg.id);
      }

      const bookingPatch: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (scheduledLocal) bookingPatch.start_at = londonLocalToUtcIso(scheduledLocal);
      if (hours !== undefined && Number.isFinite(hours)) bookingPatch.hours_requested = hours;
      if (days !== undefined && Number.isFinite(days)) bookingPatch.days_requested = days;
      await admin.from("bookings").update(bookingPatch).eq("id", bookingId);

      // Keep trip_configuration_raw flightNumber in sync when possible
      if (flightNumber !== undefined) {
        const { data: rawBooking } = await admin
          .from("bookings")
          .select("trip_configuration_raw")
          .eq("id", bookingId)
          .single();
        const raw =
          rawBooking?.trip_configuration_raw &&
          typeof rawBooking.trip_configuration_raw === "object"
            ? { ...(rawBooking.trip_configuration_raw as Record<string, unknown>) }
            : {};
        raw.flightNumber = flightNumber || null;
        await admin
          .from("bookings")
          .update({ trip_configuration_raw: raw, updated_at: new Date().toISOString() })
          .eq("id", bookingId);
      }

      await logBookingAdminActivity(admin, {
        bookingId,
        bookingLegId: mainLeg.id,
        organizationId: booking.organization_id,
        actionType: "trip_edit",
        reasonCode,
        reasonText: reasonText || null,
        fromValue,
        toValue: {
          scheduledAt: legPatch.scheduled_at ?? fromValue.scheduledAt,
          pickupAddress: legPatch.pickup_address ?? fromValue.pickupAddress,
          pickupLat: legPatch.pickup_lat ?? fromValue.pickupLat,
          pickupLng: legPatch.pickup_lng ?? fromValue.pickupLng,
          dropoffAddress: legPatch.dropoff_address ?? fromValue.dropoffAddress,
          dropoffLat: legPatch.dropoff_lat ?? fromValue.dropoffLat,
          dropoffLng: legPatch.dropoff_lng ?? fromValue.dropoffLng,
          flightNumber: legPatch.flight_number ?? fromValue.flightNumber,
          hoursRequested: bookingPatch.hours_requested ?? fromValue.hoursRequested,
          daysRequested: bookingPatch.days_requested ?? fromValue.daysRequested,
        },
        ...actor,
      });

      return NextResponse.json({ success: true, action: "trip_edit" });
    }

    if (action === "edit_vehicle") {
      if (!mainLeg) {
        return NextResponse.json({ success: false, error: "No leg to edit" }, { status: 400 });
      }
      const categoryId =
        typeof body.vehicleCategoryId === "string" ? body.vehicleCategoryId.trim() : "";
      const modelId =
        typeof body.vehicleModelId === "string" ? body.vehicleModelId.trim() : "";
      if (!categoryId) {
        return NextResponse.json(
          { success: false, error: "vehicleCategoryId is required" },
          { status: 400 }
        );
      }

      const fromValue = {
        vehicleCategoryId: mainLeg.vehicle_category_id,
        vehicleModelId: mainLeg.vehicle_model_id,
      };

      for (const leg of legs || []) {
        if (String(leg.status).toUpperCase() === "CANCELLED") continue;
        await admin
          .from("booking_legs")
          .update({
            vehicle_category_id: categoryId,
            vehicle_model_id: modelId || null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", leg.id);
      }

      await logBookingAdminActivity(admin, {
        bookingId,
        bookingLegId: mainLeg.id,
        organizationId: booking.organization_id,
        actionType: "vehicle_edit",
        reasonCode,
        reasonText: reasonText || null,
        fromValue,
        toValue: { vehicleCategoryId: categoryId, vehicleModelId: modelId || null },
        ...actor,
      });

      return NextResponse.json({ success: true, action: "vehicle_edit" });
    }

    if (action === "add_note") {
      const note = typeof body.note === "string" ? body.note.trim() : "";
      if (!note) {
        return NextResponse.json({ success: false, error: "note is required" }, { status: 400 });
      }
      const stamp = new Date().toISOString();
      const prev = booking.notes_internal || "";
      const next = prev
        ? `${prev}\n\n[${stamp}] ${actor.actorEmail || "admin"}: ${note}`
        : `[${stamp}] ${actor.actorEmail || "admin"}: ${note}`;

      await admin
        .from("bookings")
        .update({ notes_internal: next, updated_at: stamp })
        .eq("id", bookingId);

      await logBookingAdminActivity(admin, {
        bookingId,
        bookingLegId: mainLeg?.id ?? null,
        organizationId: booking.organization_id,
        actionType: "note_added",
        reasonCode,
        reasonText: reasonText || note,
        fromValue: { notesInternal: prev || null },
        toValue: { notesInternal: next },
        ...actor,
      });

      return NextResponse.json({ success: true, action: "note_added" });
    }

    if (action === "mark_paid") {
      const amountPence = Number(body.amountPence);
      if (!Number.isFinite(amountPence) || amountPence <= 0) {
        return NextResponse.json(
          { success: false, error: "amountPence must be > 0" },
          { status: 400 }
        );
      }

      const { data: payment, error: payErr } = await admin
        .from("booking_payments")
        .insert({
          booking_id: bookingId,
          amount_pence: Math.round(amountPence),
          currency: "GBP",
          status: "succeeded",
          organization_id: booking.organization_id,
          payment_kind: "manual",
          metadata: {
            created_by: "admin",
            note: reasonText || "Marked paid by admin",
            reason_code: reasonCode,
            bypass: true,
          },
          livemode: false,
        })
        .select("id")
        .single();

      if (payErr || !payment) {
        return NextResponse.json(
          { success: false, error: payErr?.message || "Payment insert failed" },
          { status: 500 }
        );
      }

      if (booking.status !== "CONFIRMED" && booking.status !== "COMPLETED") {
        await admin
          .from("bookings")
          .update({ status: "CONFIRMED", updated_at: new Date().toISOString() })
          .eq("id", bookingId);
      }

      await logBookingAdminActivity(admin, {
        bookingId,
        bookingLegId: mainLeg?.id ?? null,
        organizationId: booking.organization_id,
        actionType: "mark_paid",
        reasonCode,
        reasonText: reasonText || null,
        fromValue: { status: booking.status },
        toValue: { status: "CONFIRMED", amountPence: Math.round(amountPence), paymentId: payment.id },
        ...actor,
      });

      return NextResponse.json({
        success: true,
        action: "mark_paid",
        paymentId: payment.id,
      });
    }

    if (action === "payment_link") {
      const { data: customer } = booking.customer_id
        ? await admin
            .from("customers")
            .select("id, email")
            .eq("id", booking.customer_id)
            .maybeSingle()
        : { data: null };

      const upstream = await fetch(`${BACKEND}/api/pricing/create-payment-intent`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId,
          ...(customer?.id &&
            customer.email && {
              customerData: { customerId: customer.id, email: customer.email },
            }),
        }),
      });
      const result = await upstream.json().catch(() => ({}));
      if (!upstream.ok) {
        return NextResponse.json(
          { success: false, error: result?.error || "Payment link failed" },
          { status: upstream.status || 502 }
        );
      }
      const data = result.success && result.data ? result.data : result;
      const hostedUrl = data.hostedInvoiceUrl || data.hosted_invoice_url || null;

      await logBookingAdminActivity(admin, {
        bookingId,
        bookingLegId: mainLeg?.id ?? null,
        organizationId: booking.organization_id,
        actionType: "payment_link",
        reasonCode,
        reasonText: reasonText || null,
        fromValue: null,
        toValue: {
          hostedUrl,
          paymentIntentId: data.paymentIntentId || null,
          amount: data.amount ?? null,
        },
        ...actor,
      });

      return NextResponse.json({
        success: true,
        action: "payment_link",
        hostedUrl,
        paymentIntentId: data.paymentIntentId || null,
        clientSecret: data.clientSecret || null,
        amount: data.amount ?? null,
      });
    }

    if (action === "extra_charge") {
      const amountPence = Number(body.amountPence);
      const hoursExtra =
        body.hoursExtra != null && body.hoursExtra !== "" ? Number(body.hoursExtra) : null;
      if (!Number.isFinite(amountPence) || amountPence < 50) {
        return NextResponse.json(
          { success: false, error: "amountPence must be at least 50" },
          { status: 400 }
        );
      }

      const { data: customer } = booking.customer_id
        ? await admin
            .from("customers")
            .select("id, email, first_name, last_name, stripe_customer_id")
            .eq("id", booking.customer_id)
            .maybeSingle()
        : { data: null };

      if (!customer?.email) {
        return NextResponse.json(
          { success: false, error: "Customer email required for Stripe invoice" },
          { status: 400 }
        );
      }

      const description =
        hoursExtra && Number.isFinite(hoursExtra)
          ? `Extra ${hoursExtra} hour(s) — booking ${booking.reference}`
          : `Additional charge — booking ${booking.reference}`;

      const invoice = await createStripeAddonInvoice({
        amountPence: Math.round(amountPence),
        customerEmail: customer.email,
        customerName: `${customer.first_name || ""} ${customer.last_name || ""}`.trim(),
        existingStripeCustomerId: customer.stripe_customer_id,
        bookingReference: booking.reference,
        bookingId,
        description,
        hoursExtra,
      });

      if (!customer.stripe_customer_id && invoice.stripeCustomerId) {
        await admin
          .from("customers")
          .update({
            stripe_customer_id: invoice.stripeCustomerId,
            updated_at: new Date().toISOString(),
          })
          .eq("id", customer.id);
      }

      // Pending payment row — webhook / manual mark can flip to succeeded later
      const { data: payment, error: payErr } = await admin
        .from("booking_payments")
        .insert({
          booking_id: bookingId,
          amount_pence: invoice.amountPence,
          currency: "GBP",
          status: "pending",
          organization_id: booking.organization_id,
          payment_kind: "extra_hours",
          stripe_customer_id: invoice.stripeCustomerId,
          stripe_invoice_id: invoice.invoiceId,
          stripe_invoice_status: invoice.status,
          stripe_invoice_number: invoice.invoiceNumber,
          hosted_invoice_url: invoice.hostedInvoiceUrl,
          invoice_finalized_at: new Date().toISOString(),
          invoice_sent_at: new Date().toISOString(),
          receipt_email: customer.email,
          metadata: {
            created_by: "admin",
            hours_extra: hoursExtra,
            reason_code: reasonCode,
            description,
          },
          livemode: !String(process.env.STRIPE_SECRET_KEY || "").includes("sk_test"),
        })
        .select("id")
        .single();

      if (payErr) {
        return NextResponse.json(
          {
            success: false,
            error: `Invoice created but DB payment insert failed: ${payErr.message}`,
            hostedUrl: invoice.hostedInvoiceUrl,
            invoiceId: invoice.invoiceId,
          },
          { status: 500 }
        );
      }

      // Optionally bump booked hours immediately (ops choice via applyHoursNow)
      if (body.applyHoursNow && hoursExtra && Number.isFinite(hoursExtra) && hoursExtra > 0) {
        const nextHours = Number(booking.hours_requested || 0) + hoursExtra;
        await admin
          .from("bookings")
          .update({ hours_requested: nextHours, updated_at: new Date().toISOString() })
          .eq("id", bookingId);
      }

      await logBookingAdminActivity(admin, {
        bookingId,
        bookingLegId: mainLeg?.id ?? null,
        organizationId: booking.organization_id,
        actionType: "extra_charge",
        reasonCode,
        reasonText: reasonText || null,
        fromValue: { hoursRequested: booking.hours_requested },
        toValue: {
          amountPence: invoice.amountPence,
          hoursExtra,
          hostedUrl: invoice.hostedInvoiceUrl,
          invoiceId: invoice.invoiceId,
          paymentId: payment?.id ?? null,
          applyHoursNow: Boolean(body.applyHoursNow),
        },
        ...actor,
      });

      return NextResponse.json({
        success: true,
        action: "extra_charge",
        hostedUrl: invoice.hostedInvoiceUrl,
        invoiceId: invoice.invoiceId,
        invoiceNumber: invoice.invoiceNumber,
        paymentId: payment?.id ?? null,
      });
    }

    // cancel
    if (action !== "cancel") {
      return NextResponse.json({ success: false, error: "Unhandled action" }, { status: 400 });
    }
    if (booking.status === "CANCELLED") {
      return NextResponse.json({ success: false, error: "Already cancelled" }, { status: 400 });
    }

    await admin
      .from("bookings")
      .update({ status: "CANCELLED", updated_at: new Date().toISOString() })
      .eq("id", bookingId);

    await admin
      .from("booking_legs")
      .update({ status: "CANCELLED", updated_at: new Date().toISOString() })
      .eq("booking_id", bookingId)
      .is("deleted_at", null);

    await logBookingAdminActivity(admin, {
      bookingId,
      bookingLegId: mainLeg?.id ?? null,
      organizationId: booking.organization_id,
      actionType: "cancel",
      reasonCode,
      reasonText: reasonText || null,
      fromValue: { status: booking.status },
      toValue: { status: "CANCELLED" },
      ...actor,
    });

    return NextResponse.json({ success: true, action: "cancel", status: "CANCELLED" });
  } catch (err) {
    console.error("[admin/bookings/ops]", err);
    const msg = err instanceof Error ? err.message : "Ops failed";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
