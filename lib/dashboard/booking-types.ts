import { isCancelledBooking, type DashboardBookingRow } from "@/lib/dashboard/compute-stats";

export const DASHBOARD_BOOKING_TYPES = [
  { id: "oneway", label: "One-way" },
  { id: "return", label: "Return" },
  { id: "hourly", label: "Hourly" },
  { id: "daily", label: "Daily" },
  { id: "fleet", label: "Fleet" },
] as const;

const KNOWN_IDS = new Set<string>(DASHBOARD_BOOKING_TYPES.map((type) => type.id));

function prettyUnknownType(id: string): string {
  return id
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

/** Map SSOT type_id → count into chart series (labels stay in the app). */
export function bookingTypesFromCounts(
  countsRaw: Record<string, number>
): Array<{ name: string; value: number }> {
  const counts = new Map<string, number>();

  for (const type of DASHBOARD_BOOKING_TYPES) {
    counts.set(type.id, 0);
  }

  for (const [id, value] of Object.entries(countsRaw)) {
    const key = (id || "unknown").toLowerCase();
    counts.set(key, (counts.get(key) || 0) + (Number(value) || 0));
  }

  const known = DASHBOARD_BOOKING_TYPES.map((type) => ({
    name: type.label,
    value: counts.get(type.id) || 0,
  }));

  const extra = [...counts.entries()]
    .filter(([id]) => !KNOWN_IDS.has(id))
    .map(([id, value]) => ({
      name: prettyUnknownType(id),
      value,
    }));

  return [...known, ...extra];
}

export function aggregateBookingTypes(
  bookings: Array<DashboardBookingRow & { booking_type?: string | null }>
): Array<{ name: string; value: number }> {
  const countsRaw: Record<string, number> = {};

  for (const booking of bookings) {
    if (isCancelledBooking(booking)) continue;
    const id = (booking.booking_type || "unknown").toLowerCase();
    countsRaw[id] = (countsRaw[id] || 0) + 1;
  }

  return bookingTypesFromCounts(countsRaw);
}
