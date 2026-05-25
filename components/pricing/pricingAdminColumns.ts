/**
 * Admin pricing column definitions + booking-type visibility (mirrors backend FeeCalculators).
 */

export type ColType = "text" | "pence" | "number" | "boolean" | "readonly";

export interface ColDef {
  key: string;
  label: string;
  type: ColType;
  width?: string;
}

/** Fields in pricing_daily_rules that exist in DB but are NOT used by calculateDailyFee(). */
export const DAILY_ENGINE_DEAD_FIELDS = [
  {
    field: "included_hours",
    adminLabel: "Incl. hrs",
    engine: "Description text only in quote breakdown — not in price formula",
  },
  {
    field: "included_miles",
    adminLabel: "Incl. mi",
    engine: "Not read by backend",
  },
  {
    field: "extra_hour_rate_pence",
    adminLabel: "Extra hr rate",
    engine: "Not read — no overtime pricing",
  },
  {
    field: "extra_mile_rate_pence",
    adminLabel: "Extra mi rate",
    engine: "Not read — no extra mileage pricing",
  },
] as const;

/** SSOT for daily client price: pricing_vehicle_rates.daily_rate_pence + minimum_fare_pence */
export const DAILY_ENGINE_SSOT = {
  table: "pricing_vehicle_rates",
  bookingTypes: ["daily", "fleet_daily"],
  rateColumn: "daily_rate_pence",
  floorColumn: "minimum_fare_pence",
  engineFunctions: [
    "FeeCalculators.calculateDailyFee()",
    "FeeCalculators.applyMinimumFareToFinal()",
    "PricingDataService.getVehicleRates(bookingType=daily)",
  ],
} as const;

const MILEAGE_KEYS = new Set([
  "base_fare_pence",
  "per_mile_first_6_pence",
  "per_mile_after_6_pence",
  "per_minute_pence",
]);

const HOURLY_ONLY_KEYS = new Set(["hourly_rate_pence"]);
const DAILY_ONLY_KEYS = new Set(["daily_rate_pence"]);

export function normalizeBookingType(bt: string): string {
  return String(bt || "").toLowerCase().replace(/-/g, "_");
}

export function isMileageBookingType(bt: string): boolean {
  const n = normalizeBookingType(bt);
  return !["hourly", "daily", "fleet_hourly", "fleet_daily"].includes(n);
}

export function isColApplicableToBookingType(colKey: string, bookingType: string): boolean {
  const bt = normalizeBookingType(bookingType);
  if (colKey === "vehicle_category_id" || colKey === "booking_type" || colKey === "active") {
    return true;
  }
  if (MILEAGE_KEYS.has(colKey)) return isMileageBookingType(bt);
  if (HOURLY_ONLY_KEYS.has(colKey)) return bt === "hourly" || bt === "fleet_hourly";
  if (DAILY_ONLY_KEYS.has(colKey)) return bt === "daily" || bt === "fleet_daily";
  if (colKey === "minimum_fare_pence") return true;
  return true;
}

export const VEHICLE_RATE_COLS: ColDef[] = [
  { key: "vehicle_category_id", label: "Vehicle", type: "readonly", width: "145px" },
  { key: "booking_type", label: "Type", type: "readonly", width: "130px" },
  { key: "base_fare_pence", label: "Base fare", type: "pence", width: "150px" },
  { key: "per_mile_first_6_pence", label: "£/mi 1–6", type: "pence", width: "146px" },
  { key: "per_mile_after_6_pence", label: "£/mi 6+", type: "pence", width: "146px" },
  { key: "per_minute_pence", label: "£/min", type: "pence", width: "132px" },
  { key: "hourly_rate_pence", label: "Hourly rate (£/hr)", type: "pence", width: "160px" },
  { key: "daily_rate_pence", label: "Daily Package Price", type: "pence", width: "180px" },
  { key: "minimum_fare_pence", label: "Min fare", type: "pence", width: "146px" },
  { key: "active", label: "Active", type: "boolean", width: "90px" },
];

/** Build column list for currently visible vehicle-rate rows (hides misleading mileage cols on daily/hourly). */
export function getColsForVehicleRateRows(rows: { booking_type?: unknown }[], allCols: ColDef[]): ColDef[] {
  const keysUsed = new Set<string>();
  for (const row of rows) {
    const bt = String(row.booking_type ?? "");
    for (const col of allCols) {
      if (isColApplicableToBookingType(col.key, bt)) keysUsed.add(col.key);
    }
  }
  const order = allCols.map((c) => c.key);
  return allCols.filter((c) => keysUsed.has(c.key)).sort(
    (a, b) => order.indexOf(a.key) - order.indexOf(b.key)
  );
}

/** Tables that show £ fields with VAT preview in admin. */
/** Tabs with £ fields that show NET / VAT / FINAL WEBSITE PRICE under inputs. Hourly £/hr lives on Vehicle Rates. */
export const VAT_PREVIEW_TABLES = new Set([
  "pricing_vehicle_rates",
  "pricing_daily_rules",
  "pricing_airport_fees",
  "pricing_zone_fees",
  "service_items",
]);
