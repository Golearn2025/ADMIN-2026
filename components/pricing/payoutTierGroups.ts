/**
 * Driver payout tier groups — mirrors DB enum payout_tier_group + resolve_driver_payout_tier_group().
 */

export type PayoutTierGroup = "trip" | "duration";

export const PAYOUT_TIER_GROUP_LABELS: Record<PayoutTierGroup, string> = {
  trip: "Tier 1 — Trip (one-way, return, fleet assembly)",
  duration: "Tier 2 — Duration (hourly, daily, fleet hours/days)",
};

export const VEHICLE_CATEGORY_OPTIONS = ["executive", "luxury", "suv", "mpv"] as const;
export type VehicleCategoryId = (typeof VEHICLE_CATEGORY_OPTIONS)[number];

export function normalizeTierGroup(raw: unknown): PayoutTierGroup {
  return String(raw) === "duration" ? "duration" : "trip";
}

export function filterTiersByGroup<T extends { tier_group?: unknown }>(
  rows: T[],
  group: PayoutTierGroup
): T[] {
  return rows.filter((r) => normalizeTierGroup(r.tier_group) === group);
}
