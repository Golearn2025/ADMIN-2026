#!/usr/bin/env node
/**
 * Clone the latest (or a given) booking into a NEW paid Direct job for fast dispatch tests.
 *
 * Defaults:
 *   - customer: Catalin Tomita (from source booking / tomitacatalin86@gmail.com)
 *   - driver:   test@vantage-lane.com (Direct exclusive)
 *   - pickup in ~90 minutes (so it stays a live offer)
 *
 * Usage:
 *   node scripts/repeat-dispatch-test.mjs
 *   node scripts/repeat-dispatch-test.mjs --from CB-001024
 *   node scripts/repeat-dispatch-test.mjs --premium
 *   node scripts/repeat-dispatch-test.mjs --open
 *   node scripts/repeat-dispatch-test.mjs --count 3
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadEnvLocal() {
  const path = resolve(process.cwd(), ".env.local");
  const raw = readFileSync(path, "utf8");
  for (const line of raw.split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 0) continue;
    const key = t.slice(0, i).trim();
    let val = t.slice(i + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = val;
  }
}

function argValue(flag) {
  const i = process.argv.indexOf(flag);
  if (i < 0) return null;
  return process.argv[i + 1] ?? null;
}

function hasFlag(flag) {
  return process.argv.includes(flag);
}

function pin4() {
  return String(Math.floor(1000 + Math.random() * 9000));
}

loadEnvLocal();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const admin = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const ORG = "9a5caade-4791-4860-93b5-12b1c4fa9830";
const DRIVER_EMAIL = (argValue("--driver") || "test@vantage-lane.com").toLowerCase();
const FROM_REF = argValue("--from");
const COUNT = Math.max(1, Number(argValue("--count") || 1) || 1);
const MODE = hasFlag("--open") ? "open" : "direct";
const RELEASE_PREMIUM = hasFlag("--premium");
const WAIT_MIN = Math.max(1, Number(argValue("--wait") || 10) || 10);

async function resolveDriver() {
  const { data, error } = await admin
    .from("drivers")
    .select("id, first_name, last_name, email, status, organization_id")
    .eq("organization_id", ORG)
    .is("deleted_at", null)
    .ilike("email", DRIVER_EMAIL)
    .maybeSingle();
  if (error || !data) throw new Error(`Driver not found: ${DRIVER_EMAIL}`);
  if (data.status !== "approved") {
    throw new Error(`Driver ${DRIVER_EMAIL} status=${data.status} (need approved)`);
  }
  return data;
}

async function resolveSource() {
  let q = admin
    .from("bookings")
    .select(
      "id, reference, status, booking_type, organization_id, customer_id, currency, passenger_count, bag_count, hours_requested, days_requested, trip_configuration_raw, notes_internal, billing_snapshot, custom_requirements"
    )
    .eq("organization_id", ORG)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(1);

  if (FROM_REF) {
    q = admin
      .from("bookings")
      .select(
        "id, reference, status, booking_type, organization_id, customer_id, currency, passenger_count, bag_count, hours_requested, days_requested, trip_configuration_raw, notes_internal, billing_snapshot, custom_requirements"
      )
      .eq("reference", FROM_REF)
      .is("deleted_at", null)
      .maybeSingle();
    const { data, error } = await q;
    if (error || !data) throw new Error(`Source booking not found: ${FROM_REF}`);
    return data;
  }

  const { data, error } = await q.maybeSingle();
  if (error || !data) throw new Error("No source booking found");
  return data;
}

async function resolveSourceLeg(bookingId) {
  const { data, error } = await admin
    .from("booking_legs")
    .select(
      "id, leg_number, leg_kind, pickup_address, dropoff_address, pickup_lat, pickup_lng, dropoff_lat, dropoff_lng, pickup_place_id, dropoff_place_id, vehicle_category_id, vehicle_model_id, distance_miles, duration_min, flight_number, addons, stops_raw"
    )
    .eq("booking_id", bookingId)
    .is("deleted_at", null)
    .order("leg_number", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error || !data) throw new Error("Source leg not found");
  return data;
}

async function resolveAmountPence(bookingId) {
  const { data } = await admin
    .from("booking_payments")
    .select("amount_pence")
    .eq("booking_id", bookingId)
    .is("deleted_at", null)
    .eq("status", "succeeded")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data?.amount_pence ?? 500;
}

async function nextReference() {
  const { data, error } = await admin.rpc("generate_booking_reference");
  if (error || !data) throw new Error(`generate_booking_reference failed: ${error?.message}`);
  return String(data);
}

async function createOne({ driver, source, leg, amountPence }) {
  const reference = await nextReference();
  const scheduledAt = new Date(Date.now() + 90 * 60_000).toISOString();
  const now = new Date().toISOString();

  const tripRaw =
    source.trip_configuration_raw && typeof source.trip_configuration_raw === "object"
      ? {
          ...source.trip_configuration_raw,
          dateTime: scheduledAt,
        }
      : {
          bookingType: source.booking_type || "oneway",
          pickup: { address: leg.pickup_address },
          dropoff: { address: leg.dropoff_address },
          dateTime: scheduledAt,
          vehicleType: leg.vehicle_category_id || "luxury",
          passengers: source.passenger_count || 1,
          additionalStops: [],
          extras: [],
        };

  const { data: booking, error: bookingErr } = await admin
    .from("bookings")
    .insert({
      organization_id: ORG,
      customer_id: source.customer_id,
      reference,
      status: "CONFIRMED",
      booking_type: source.booking_type || "oneway",
      currency: source.currency || "GBP",
      passenger_count: source.passenger_count ?? 1,
      bag_count: source.bag_count ?? 0,
      hours_requested: source.hours_requested,
      days_requested: source.days_requested,
      start_at: scheduledAt,
      trip_configuration_raw: tripRaw,
      notes_internal: `Repeat dispatch test from ${source.reference} | Direct → ${driver.email}`,
      billing_snapshot: source.billing_snapshot || {
        price_override_gbp: amountPence / 100,
        price_override_pence: amountPence,
        overridden_by: "repeat-dispatch-test",
      },
      custom_requirements: source.custom_requirements,
      source: "web",
      verification_pin: pin4(),
      payment_intent_kind: "instant",
      payment_flow_version: "legacy",
      updated_at: now,
    })
    .select("id, reference")
    .single();

  if (bookingErr || !booking) {
    throw new Error(`Insert booking failed: ${bookingErr?.message}`);
  }

  const { data: newLeg, error: legErr } = await admin
    .from("booking_legs")
    .insert({
      organization_id: ORG,
      booking_id: booking.id,
      leg_number: 1,
      leg_kind: "main",
      status: "PENDING",
      scheduled_at: scheduledAt,
      pickup_address: leg.pickup_address,
      dropoff_address: leg.dropoff_address,
      pickup_lat: leg.pickup_lat,
      pickup_lng: leg.pickup_lng,
      dropoff_lat: leg.dropoff_lat,
      dropoff_lng: leg.dropoff_lng,
      pickup_place_id: leg.pickup_place_id,
      dropoff_place_id: leg.dropoff_place_id,
      vehicle_category_id: leg.vehicle_category_id || "luxury",
      vehicle_model_id: leg.vehicle_model_id,
      distance_miles: leg.distance_miles,
      duration_min: leg.duration_min,
      flight_number: leg.flight_number,
      addons: leg.addons,
      stops_raw: leg.stops_raw,
      updated_at: now,
    })
    .select("id")
    .single();

  if (legErr || !newLeg) {
    throw new Error(`Insert leg failed: ${legErr?.message}`);
  }

  // client_leg_quotes is required FK for internal_leg_financials
  const { data: srcQuote } = await admin
    .from("client_leg_quotes")
    .select(
      "currency, subtotal_pence, discount_pence, vat_rate, vat_pence, total_pence, line_items, calc_source, calc_version"
    )
    .eq("booking_leg_id", leg.id)
    .eq("version", 1)
    .is("deleted_at", null)
    .maybeSingle();

  const quoteTotal = amountPence;
  const { error: quoteErr } = await admin.from("client_leg_quotes").insert({
    organization_id: ORG,
    booking_id: booking.id,
    booking_leg_id: newLeg.id,
    version: 1,
    is_locked: false,
    currency: srcQuote?.currency || "GBP",
    subtotal_pence: srcQuote?.subtotal_pence ?? quoteTotal,
    discount_pence: srcQuote?.discount_pence ?? 0,
    vat_rate: srcQuote?.vat_rate ?? 0,
    vat_pence: srcQuote?.vat_pence ?? 0,
    total_pence: srcQuote?.total_pence ?? quoteTotal,
    line_items: srcQuote?.line_items || {
      summary: { total_pence: quoteTotal, subtotal_pence: quoteTotal },
      details: [{ component: "admin_override", amount_pence: quoteTotal }],
    },
    calc_source: srcQuote?.calc_source || "repeat_dispatch_test",
    calc_version: srcQuote?.calc_version || "test",
    calculated_at: now,
  });
  if (quoteErr) throw new Error(`client_leg_quotes failed: ${quoteErr.message}`);

  // Driver payout (same shape as New Job admin override) — needed for offer views
  const driverPayoutPence = Math.max(100, Math.round(amountPence * 0.2));
  const { error: finLegErr } = await admin.from("internal_leg_financials").insert({
    booking_leg_id: newLeg.id,
    booking_id: booking.id,
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
    vehicle_category_id: leg.vehicle_category_id || "luxury",
    line_items: {
      admin_override: true,
      driver_payout_gbp: driverPayoutPence / 100,
      repeat_dispatch_test: true,
    },
  });
  if (finLegErr) throw new Error(`Leg financials failed: ${finLegErr.message}`);

  if (MODE === "direct") {
    const expiresAt = new Date(Date.now() + WAIT_MIN * 60_000).toISOString();
    const { error: runErr } = await admin.from("job_dispatch_runs").insert({
      organization_id: ORG,
      booking_id: booking.id,
      booking_leg_id: newLeg.id,
      mode: "direct",
      wave: "direct",
      exclusive_driver_id: driver.id,
      status: "active",
      started_at: now,
      expires_at: expiresAt,
      updated_at: now,
    });
    if (runErr) throw new Error(`Direct run failed: ${runErr.message}`);
  }

  // Insert payment as pending first, seed booking financials, then flip to succeeded.
  // Direct INSERT succeeded hits create_financial_snapshot_for_payment which needs a
  // pricing_version — admin New Job path avoids that via quote; this clone path does not.
  const { data: payment, error: payErr } = await admin
    .from("booking_payments")
    .insert({
      booking_id: booking.id,
      organization_id: ORG,
      amount_pence: amountPence,
      currency: "GBP",
      status: "pending",
      payment_kind: "manual",
      livemode: false,
      metadata: {
        created_by: "repeat-dispatch-test",
        note: `Clone of ${source.reference}`,
        bypass: true,
        dispatch_mode: MODE,
        exclusive_driver_id: MODE === "direct" ? driver.id : null,
      },
    })
    .select("id")
    .single();
  if (payErr || !payment) throw new Error(`Payment insert failed: ${payErr?.message}`);

  const { error: finBookErr } = await admin.from("internal_booking_financials").insert({
    booking_id: booking.id,
    booking_payment_id: payment.id,
    organization_id: ORG,
    version: 1,
    currency: "GBP",
    pricing_source: "payment_succeeded",
    gross_amount_pence: amountPence,
    vat_amount_pence: 0,
    subtotal_ex_vat_pence: amountPence,
    driver_payout_pence: driverPayoutPence,
    driver_base_payout_pence: driverPayoutPence,
    driver_target_payout_pence: driverPayoutPence,
    driver_final_payout_pence: driverPayoutPence,
    driver_estimated_payout_pence: driverPayoutPence,
    driver_extras_payout_pence: 0,
    platform_fee_pence: 0,
    operator_fee_pence: 0,
    vendor_cost_pence: 0,
    processor_fee_pence: 0,
    net_collected_pence: amountPence,
    net_to_driver_pence: driverPayoutPence,
    line_items: {
      admin_override: true,
      repeat_dispatch_test: true,
      source_reference: source.reference,
    },
    calculated_at: now,
  });
  if (finBookErr) throw new Error(`Booking financials failed: ${finBookErr.message}`);

  const { error: payUpdErr } = await admin
    .from("booking_payments")
    .update({ status: "succeeded", updated_at: now })
    .eq("id", payment.id);
  if (payUpdErr) throw new Error(`Payment succeed failed: ${payUpdErr.message}`);

  let premium = null;
  if (RELEASE_PREMIUM) {
    if (MODE !== "direct") {
      throw new Error("--premium requires Direct mode (omit --open)");
    }
    const { data, error } = await admin.rpc("release_booking_dispatch_to_premium", {
      p_booking_id: booking.id,
      p_actor_id: null,
    });
    if (error) throw new Error(`Release premium failed: ${error.message}`);
    premium = data;
  }

  return {
    reference: booking.reference,
    bookingId: booking.id,
    legId: newLeg.id,
    scheduledAt,
    amountPence,
    premium,
  };
}

async function main() {
  const driver = await resolveDriver();
  const source = await resolveSource();
  const leg = await resolveSourceLeg(source.id);
  const amountPence = await resolveAmountPence(source.id);

  console.log("Source:", source.reference);
  console.log("Customer id:", source.customer_id);
  console.log(
    "Driver:",
    `${driver.first_name} ${driver.last_name}`.trim(),
    `<${driver.email}>`
  );
  console.log("Mode:", MODE, RELEASE_PREMIUM ? "+ release premium" : "");
  console.log("Count:", COUNT);
  console.log("---");

  for (let i = 0; i < COUNT; i++) {
    const created = await createOne({ driver, source, leg, amountPence });
    console.log(
      `#${i + 1}`,
      created.reference,
      `| £${(created.amountPence / 100).toFixed(2)}`,
      `| pickup ${created.scheduledAt}`,
      created.premium ? `| premium=${JSON.stringify(created.premium)}` : ""
    );
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
