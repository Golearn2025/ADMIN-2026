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

export const VEHICLE_CATEGORY_LABELS: Record<VehicleCategoryId, string> = {
  executive: "Executive",
  luxury: "Luxury",
  suv: "SUV",
  mpv: "MPV",
};

export function normalizeTierGroup(raw: unknown): PayoutTierGroup {
  return String(raw) === "duration" ? "duration" : "trip";
}

export function normalizeVehicleCategory(raw: unknown): VehicleCategoryId {
  const value = String(raw ?? "executive");
  return (VEHICLE_CATEGORY_OPTIONS as readonly string[]).includes(value)
    ? (value as VehicleCategoryId)
    : "executive";
}

export function filterTiersByGroup<T extends { tier_group?: unknown }>(
  rows: T[],
  group: PayoutTierGroup
): T[] {
  return rows.filter((r) => normalizeTierGroup(r.tier_group) === group);
}

export function filterTiersByGroupAndCategory<
  T extends { tier_group?: unknown; vehicle_category_id?: unknown },
>(rows: T[], group: PayoutTierGroup, category: VehicleCategoryId): T[] {
  return rows.filter(
    (r) =>
      normalizeTierGroup(r.tier_group) === group &&
      normalizeVehicleCategory(r.vehicle_category_id) === category
  );
}

export function tierCreateKey(category: VehicleCategoryId, group: PayoutTierGroup): string {
  return `${category}:${group}`;
}
