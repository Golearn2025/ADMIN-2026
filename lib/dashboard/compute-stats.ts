export type DashboardBookingRow = {
  status?: string | null;
  start_at?: string | null;
  display_price_pence?: number | string | null;
  latest_payment_status?: string | null;
  assigned_driver_id?: string | null;
  driver_name?: string | null;
  trip_status?: string | null;
};

export const CONFIRMED_STATUSES = ["CONFIRMED", "COMPLETED"] as const;
export const PENDING_STATUSES = [
  "NEW",
  "PENDING_PAYMENT",
  "AWAITING_INVOICE_CONFIRM",
] as const;

function pence(value: number | string | null | undefined): number {
  return Number(value) || 0;
}

export function isPaidBooking(booking: DashboardBookingRow): boolean {
  return booking.latest_payment_status === "succeeded";
}

export function isCancelledBooking(booking: DashboardBookingRow): boolean {
  return booking.status === "CANCELLED";
}

export function isAssignedBooking(booking: DashboardBookingRow): boolean {
  return Boolean(booking.assigned_driver_id || booking.driver_name);
}

export function isCompletedBooking(booking: DashboardBookingRow): boolean {
  return booking.status === "COMPLETED" || booking.trip_status === "COMPLETED";
}

export function computeDashboardStats(
  bookings: DashboardBookingRow[],
  now: Date = new Date()
) {
  const nowIso = now.toISOString();
  const paid = bookings.filter(isPaidBooking);
  const active = bookings.filter((booking) => !isCancelledBooking(booking));

  const totalRevenuePence = paid.reduce(
    (sum, booking) => sum + pence(booking.display_price_pence),
    0
  );

  return {
    total_revenue_pence: totalRevenuePence,
    total_bookings: active.length,
    avg_booking_value_pence:
      paid.length > 0 ? Math.round(totalRevenuePence / paid.length) : 0,
    confirmed_bookings: bookings.filter((booking) =>
      CONFIRMED_STATUSES.includes(
        booking.status as (typeof CONFIRMED_STATUSES)[number]
      )
    ).length,
    pending_bookings: bookings.filter((booking) =>
      PENDING_STATUSES.includes(
        booking.status as (typeof PENDING_STATUSES)[number]
      )
    ).length,
    scheduled_bookings: bookings.filter(
      (booking) =>
        !!booking.start_at &&
        booking.start_at > nowIso &&
        !isCancelledBooking(booking)
    ).length,
    cancelled_bookings: bookings.filter(isCancelledBooking).length,
    paid_bookings: paid.length,
    incoming_bookings: active.length,
    incoming_value_pence: active.reduce(
      (sum, booking) => sum + pence(booking.display_price_pence),
      0
    ),
    completed_bookings: active.filter(isCompletedBooking).length,
    in_progress_bookings: active.filter(
      (booking) => isAssignedBooking(booking) && !isCompletedBooking(booking)
    ).length,
    assigned_bookings: active.filter(isAssignedBooking).length,
    unassigned_bookings: active.filter(
      (booking) => !isAssignedBooking(booking) && !isCompletedBooking(booking)
    ).length,
  };
}
