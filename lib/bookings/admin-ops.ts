/** Shared constants + helpers for admin booking ops (Phase A). */

export const DRIVER_CHANGE_REASONS = [
  { code: "driver_unavailable", label: "Driver unavailable" },
  { code: "vehicle_issue", label: "Vehicle issue" },
  { code: "client_request", label: "Client request" },
  { code: "late_no_show", label: "Late / no-show risk" },
  { code: "better_match", label: "Better match nearby" },
  { code: "ops_decision", label: "Ops decision" },
  { code: "other", label: "Other" },
] as const;

export const STATUS_CHANGE_REASONS = [
  { code: "ops_correction", label: "Ops correction" },
  { code: "client_request", label: "Client request" },
  { code: "payment_update", label: "Payment update" },
  { code: "trip_progress", label: "Trip progress" },
  { code: "other", label: "Other" },
] as const;

export const CANCEL_REASONS = [
  { code: "client_cancelled", label: "Client cancelled" },
  { code: "no_driver", label: "No driver available" },
  { code: "payment_issue", label: "Payment issue" },
  { code: "duplicate", label: "Duplicate booking" },
  { code: "weather_force_majeure", label: "Weather / force majeure" },
  { code: "ops_decision", label: "Ops decision" },
  { code: "other", label: "Other" },
] as const;

export const TRIP_EDIT_REASONS = [
  { code: "client_request", label: "Client request" },
  { code: "ops_correction", label: "Ops correction" },
  { code: "traffic_delay", label: "Traffic / delay" },
  { code: "flight_change", label: "Flight change" },
  { code: "other", label: "Other" },
] as const;

export const VEHICLE_EDIT_REASONS = [
  { code: "client_upgrade", label: "Client upgrade" },
  { code: "client_downgrade", label: "Client downgrade" },
  { code: "availability", label: "Availability" },
  { code: "ops_decision", label: "Ops decision" },
  { code: "other", label: "Other" },
] as const;

export const PAYMENT_OPS_REASONS = [
  { code: "cash_pos", label: "Cash / POS" },
  { code: "bank_transfer", label: "Bank transfer" },
  { code: "extra_hours", label: "Extra hours" },
  { code: "addon_service", label: "Addon service" },
  { code: "ops_decision", label: "Ops decision" },
  { code: "other", label: "Other" },
] as const;

export const VEHICLE_CATEGORIES = [
  { id: "executive", label: "Executive" },
  { id: "luxury", label: "Luxury" },
  { id: "mpv", label: "MPV" },
  { id: "suv", label: "SUV" },
] as const;

export const VEHICLE_MODELS: Record<string, { id: string; label: string }[]> = {
  executive: [
    { id: "bmw-5-series", label: "BMW 5 Series" },
    { id: "mercedes-e-class", label: "Mercedes E-Class" },
  ],
  luxury: [
    { id: "bmw-7-series", label: "BMW 7 Series" },
    { id: "mercedes-s-class", label: "Mercedes S-Class" },
  ],
  mpv: [{ id: "mercedes-v-class", label: "Mercedes V-Class" }],
  suv: [{ id: "range-rover", label: "Range Rover" }],
};

/** Admin-allowed booking status targets (not every enum value). */
export const ADMIN_STATUS_OPTIONS = [
  "PENDING_PAYMENT",
  "AWAITING_INVOICE_CONFIRM",
  "CONFIRMED",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
] as const;

export type AdminBookingStatus = (typeof ADMIN_STATUS_OPTIONS)[number];

export function labelForReason(
  list: readonly { code: string; label: string }[],
  code: string | null | undefined
): string {
  if (!code) return "—";
  return list.find((r) => r.code === code)?.label || code;
}

export function actionTypeLabel(action: string): string {
  switch (action) {
    case "driver_assign":
      return "Driver assigned";
    case "driver_reassign":
      return "Driver reassigned";
    case "driver_unassign":
      return "Driver unassigned";
    case "status_change":
      return "Status changed";
    case "cancel":
      return "Booking cancelled";
    case "trip_edit":
      return "Trip updated";
    case "vehicle_edit":
      return "Vehicle updated";
    case "note_added":
      return "Internal note";
    case "mark_paid":
      return "Marked paid";
    case "payment_link":
      return "Payment link sent";
    case "extra_charge":
      return "Extra charge created";
    default:
      return action.replace(/_/g, " ");
  }
}
