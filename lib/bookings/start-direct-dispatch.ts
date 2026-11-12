import type { SupabaseClient } from "@supabase/supabase-js";

type AdminClient = SupabaseClient;

/**
 * Start exclusive Direct wave for all non-cancelled legs of a booking.
 * Must run BEFORE payment succeeds so notify + offer views see the lock.
 */
export async function startDirectDispatchRuns(opts: {
  admin: AdminClient;
  bookingId: string;
  organizationId: string;
  exclusiveDriverId: string;
  createdBy?: string | null;
  waitMinutes?: number;
}): Promise<{ ok: true; legCount: number } | { ok: false; error: string }> {
  const {
    admin,
    bookingId,
    organizationId,
    exclusiveDriverId,
    createdBy = null,
    waitMinutes = 10,
  } = opts;

  const { data: driver, error: driverErr } = await admin
    .from("drivers")
    .select("id, status, organization_id, deleted_at")
    .eq("id", exclusiveDriverId)
    .maybeSingle();

  if (driverErr || !driver || driver.deleted_at) {
    return { ok: false, error: "Driver not found" };
  }
  if (driver.organization_id !== organizationId) {
    return { ok: false, error: "Driver is not in this organization" };
  }
  if (driver.status !== "approved") {
    return { ok: false, error: "Only approved drivers can receive Direct jobs" };
  }

  const { data: legs, error: legsErr } = await admin
    .from("booking_legs")
    .select("id, status")
    .eq("booking_id", bookingId)
    .is("deleted_at", null);

  if (legsErr) {
    return { ok: false, error: legsErr.message };
  }

  const activeLegs = (legs || []).filter(
    (l) => String(l.status).toUpperCase() !== "CANCELLED"
  );
  if (!activeLegs.length) {
    return { ok: false, error: "No active legs on booking" };
  }

  const expiresAt = new Date(
    Date.now() + Math.max(1, waitMinutes) * 60_000
  ).toISOString();
  const now = new Date().toISOString();

  // Replace any previous active runs on these legs
  await admin
    .from("job_dispatch_runs")
    .update({ status: "cancelled", updated_at: now, released_at: now })
    .eq("booking_id", bookingId)
    .eq("status", "active");

  const rows = activeLegs.map((leg) => ({
    organization_id: organizationId,
    booking_id: bookingId,
    booking_leg_id: leg.id,
    mode: "direct",
    wave: "direct",
    exclusive_driver_id: exclusiveDriverId,
    status: "active",
    started_at: now,
    expires_at: expiresAt,
    created_by: createdBy,
    updated_at: now,
  }));

  const { error: insertErr } = await admin.from("job_dispatch_runs").insert(rows);
  if (insertErr) {
    return { ok: false, error: insertErr.message };
  }

  return { ok: true, legCount: rows.length };
}
