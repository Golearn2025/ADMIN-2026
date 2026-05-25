/**
 * Phase A: admin-only sync helpers (DB row updates via PATCH).
 * Does not change pricing engine or quote formulas.
 */

import { isColApplicableToBookingType, normalizeBookingType } from "@/components/pricing/pricingAdminColumns";

export type VehicleRateRow = Record<string, unknown>;

export type VehicleRateSyncPair = {
  id: string;
  label: string;
  sourceBookingType: string;
  targetBookingType: string;
};

/** Fleet sync pairs (editable targets after sync). */
export const FLEET_SYNC_PAIRS: VehicleRateSyncPair[] = [
  {
    id: "fleet-from-oneway",
    label: "Sync Fleet from Oneway",
    sourceBookingType: "oneway",
    targetBookingType: "fleet",
  },
  {
    id: "fleet-hourly-from-hourly",
    label: "Sync Fleet Hourly from Hourly",
    sourceBookingType: "hourly",
    targetBookingType: "fleet_hourly",
  },
  {
    id: "fleet-daily-from-daily",
    label: "Sync Fleet Daily from Daily",
    sourceBookingType: "daily",
    targetBookingType: "fleet_daily",
  },
];

/** Optional DB mirror — runtime return quotes already use oneway rates. */
export const RETURN_MIRROR_PAIR: VehicleRateSyncPair = {
  id: "return-from-oneway",
  label: "Mirror Return from Oneway (DB only)",
  sourceBookingType: "oneway",
  targetBookingType: "return",
};

const PRICING_VALUE_KEYS = [
  "base_fare_pence",
  "per_mile_first_6_pence",
  "per_mile_after_6_pence",
  "per_minute_pence",
  "hourly_rate_pence",
  "daily_rate_pence",
  "minimum_fare_pence",
] as const;

export function isReturnDerivedBookingType(bookingType: unknown): boolean {
  return normalizeBookingType(String(bookingType ?? "")) === "return";
}

function rowMatchKey(row: VehicleRateRow): string {
  return [
    String(row.organization_id ?? ""),
    String(row.pricing_version_id ?? ""),
    String(row.vehicle_category_id ?? ""),
  ].join("|");
}

function fieldsToCopy(sourceBt: string, targetBt: string): string[] {
  return PRICING_VALUE_KEYS.filter(
    (key) =>
      isColApplicableToBookingType(key, sourceBt) && isColApplicableToBookingType(key, targetBt)
  );
}

export function buildVehicleRateSyncUpdates(
  source: VehicleRateRow,
  target: VehicleRateRow,
  sourceBookingType: string,
  targetBookingType: string
): Record<string, unknown> {
  const updates: Record<string, unknown> = {};
  for (const key of fieldsToCopy(sourceBookingType, targetBookingType)) {
    const next = source[key];
    if (target[key] !== next) {
      updates[key] = next;
    }
  }
  return updates;
}

export type VehicleRateSyncPlan = {
  targetId: string;
  vehicleCategoryId: string;
  updates: Record<string, unknown>;
};

export function planVehicleRateSync(
  allRows: VehicleRateRow[],
  sourceBookingType: string,
  targetBookingType: string
): VehicleRateSyncPlan[] {
  const sourceBt = normalizeBookingType(sourceBookingType);
  const targetBt = normalizeBookingType(targetBookingType);

  const sources = allRows.filter(
    (r) => normalizeBookingType(String(r.booking_type ?? "")) === sourceBt
  );
  const targetsByKey = new Map<string, VehicleRateRow>();
  for (const row of allRows) {
    if (normalizeBookingType(String(row.booking_type ?? "")) !== targetBt) continue;
    targetsByKey.set(rowMatchKey(row), row);
  }

  const plans: VehicleRateSyncPlan[] = [];

  for (const source of sources) {
    const target = targetsByKey.get(rowMatchKey(source));
    if (!target || !target.id) continue;

    const updates = buildVehicleRateSyncUpdates(source, target, sourceBt, targetBt);
    if (Object.keys(updates).length === 0) continue;

    plans.push({
      targetId: String(target.id),
      vehicleCategoryId: String(target.vehicle_category_id ?? ""),
      updates,
    });
  }

  return plans;
}
