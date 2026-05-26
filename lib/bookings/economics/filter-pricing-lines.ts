import type { PricingEngineLine } from "./extract-pricing-engine-breakdown";

/** Fare components first; free catalog extras hidden from the main table. */
const COMPONENT_ORDER: Record<string, number> = {
  base_fare: 10,
  distance_fee: 20,
  time_fee: 30,
  hourly_fee: 40,
  congestion_charge: 50,
  zone_fees: 60,
  airport_fees: 70,
  toll_fees: 80,
  multi_stop_fee: 90,
  waiting_fees: 100,
  time_multiplier: 110,
  minimum_fare: 120,
  service_item: 200,
  discount: 300,
};

function sortKey(component: string): number {
  return COMPONENT_ORDER[component] ?? 150;
}

export type FilteredPricingLines = {
  chargeLines: PricingEngineLine[];
  freeExtrasCount: number;
  paidExtrasCount: number;
};

export function filterPricingDisplayLines(lines: PricingEngineLine[]): FilteredPricingLines {
  const chargeLines: PricingEngineLine[] = [];
  let freeExtrasCount = 0;
  let paidExtrasCount = 0;

  for (const line of lines) {
    if (line.component === "service_item") {
      if (line.amountPence === 0) {
        freeExtrasCount += 1;
        continue;
      }
      paidExtrasCount += 1;
      chargeLines.push(line);
      continue;
    }
    chargeLines.push(line);
  }

  chargeLines.sort((a, b) => sortKey(a.component) - sortKey(b.component));

  return { chargeLines, freeExtrasCount, paidExtrasCount };
}
