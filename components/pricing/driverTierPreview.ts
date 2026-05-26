/**
 * Admin-only preview math (UI). Does not affect DB or pricing engine.
 */

import type { PayoutTierGroup } from "@/components/pricing/payoutTierGroups";

export type TierRow = {
  label?: unknown;
  driver_payout_factor?: unknown;
  min_hours_before_job?: unknown;
  max_hours_before_job?: unknown;
  sort_order?: unknown;
  is_active?: unknown;
  tier_group?: unknown;
};

export type VehicleRateRow = {
  vehicle_category_id?: unknown;
  booking_type?: unknown;
  hourly_rate_pence?: unknown;
  daily_rate_pence?: unknown;
  minimum_fare_pence?: unknown;
  active?: unknown;
};

export function roundPayoutToWholePound(pence: number): number {
  return Math.ceil(Math.max(pence, 0) / 100) * 100;
}

export function clientNetForDurationBooking(
  ratePencePerUnit: number,
  units: number,
  minimumFarePence: number
): number {
  const unitsClamped = Math.max(units, 0);
  return Math.max(ratePencePerUnit * unitsClamped, minimumFarePence || 0);
}

export function driverPayoutFromClientNet(clientNetPence: number, factor: number): number {
  if (clientNetPence <= 0 || factor <= 0) return 0;
  return roundPayoutToWholePound(Math.round(clientNetPence * factor));
}

export function findActiveVehicleRate(
  vehicleRates: VehicleRateRow[],
  categoryId: string,
  bookingType: "hourly" | "daily"
): VehicleRateRow | undefined {
  return vehicleRates.find(
    (r) =>
      String(r.vehicle_category_id) === categoryId &&
      String(r.booking_type) === bookingType &&
      (r.active === true || r.active === "true")
  );
}

export function activeTiersForGroup(tiers: TierRow[], group: PayoutTierGroup): TierRow[] {
  return tiers
    .filter(
      (t) =>
        (t.is_active === true || t.is_active === "true") &&
        String(t.tier_group ?? "trip") === group
    )
    .sort(
      (a, b) =>
        Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0) ||
        Number(a.min_hours_before_job ?? 0) - Number(b.min_hours_before_job ?? 0)
    );
}
