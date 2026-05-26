import { filterPricingDisplayLines } from "./filter-pricing-lines";

export type PricingEngineLine = {
  component: string;
  description: string;
  amountPence: number;
};

export type PricingEngineLegBreakdown = {
  legNumber: number;
  legKind: string | null;
  vehicleCategory: string | null;
  lines: PricingEngineLine[];
  chargeLines: PricingEngineLine[];
  freeExtrasCount: number;
  paidExtrasCount: number;
  subtotalPence: number | null;
  discountPence: number | null;
  multipliers: Record<string, number>;
  vatPence: number | null;
  totalPence: number | null;
};

export type PricingTripContext = {
  bookingType: string | null;
  pickupAddress: string | null;
  dropoffAddress: string | null;
  scheduledAt: string | null;
  hours: number | null;
  distanceMiles: number | null;
  durationMinutes: number | null;
};

export type PricingEngineBreakdown = {
  source: "quote" | "ilf_snapshot" | null;
  calcSource: string | null;
  calcVersion: string | null;
  tripContext: PricingTripContext | null;
  legs: PricingEngineLegBreakdown[];
  missingReason?: string;
};

type RawDetail = {
  component?: string;
  description?: string;
  amount_pence?: number;
};

type RawComponent = {
  code?: string;
  label?: string;
  amount_pence?: number;
};

function enrichLegLines(rawLines: PricingEngineLine[]) {
  const filtered = filterPricingDisplayLines(rawLines);
  return {
    lines: rawLines,
    chargeLines: filtered.chargeLines,
    freeExtrasCount: filtered.freeExtrasCount,
    paidExtrasCount: filtered.paidExtrasCount,
  };
}

function readTripContext(meta: Record<string, unknown>): PricingTripContext | null {
  const trip = meta.trip as Record<string, unknown> | undefined;
  if (!trip || typeof trip !== "object") return null;

  const pickup = trip.pickup as Record<string, unknown> | undefined;
  const dropoff = trip.dropoff as Record<string, unknown> | undefined;

  return {
    bookingType: typeof trip.bookingType === "string" ? trip.bookingType : null,
    pickupAddress: typeof pickup?.address === "string" ? pickup.address : null,
    dropoffAddress: typeof dropoff?.address === "string" ? dropoff.address : null,
    scheduledAt: typeof trip.dateTime === "string" ? trip.dateTime : null,
    hours: typeof trip.hours === "number" ? trip.hours : null,
    distanceMiles: typeof trip.distance === "number" ? trip.distance : null,
    durationMinutes: typeof trip.duration === "number" ? trip.duration : null,
  };
}

function mapDetails(details: unknown): PricingEngineLine[] {
  if (!Array.isArray(details)) return [];
  return details
    .map((row) => {
      const d = row as RawDetail;
      return {
        component: d.component ?? "line",
        description: d.description ?? d.component ?? "Line item",
        amountPence: typeof d.amount_pence === "number" ? d.amount_pence : 0,
      };
    })
    .filter((line) => line.description);
}

function mapComponents(components: unknown): PricingEngineLine[] {
  if (!Array.isArray(components)) return [];
  return components.map((row) => {
    const c = row as RawComponent;
    return {
      component: c.code ?? "component",
      description: c.label ?? c.code ?? "Component",
      amountPence: typeof c.amount_pence === "number" ? c.amount_pence : 0,
    };
  });
}

export function extractPricingEngineFromQuote(lineItems: unknown): PricingEngineBreakdown | null {
  if (!lineItems || typeof lineItems !== "object") return null;
  const meta = (lineItems as Record<string, unknown>).meta as Record<string, unknown> | undefined;
  if (!meta) return null;

  const legsRaw = meta.legs;
  if (!Array.isArray(legsRaw) || legsRaw.length === 0) return null;

  const legs: PricingEngineLegBreakdown[] = legsRaw.map((legRow, index) => {
    const leg = legRow as Record<string, unknown>;
    const pricing = (leg.pricing ?? {}) as Record<string, unknown>;
    const multipliers =
      pricing.multipliers && typeof pricing.multipliers === "object"
        ? (pricing.multipliers as Record<string, number>)
        : {};

    const rawLines = mapDetails(pricing.details);
    const lineFields = enrichLegLines(rawLines);

    return {
      legNumber: typeof leg.leg_number === "number" ? leg.leg_number : index + 1,
      legKind: typeof leg.leg_kind === "string" ? leg.leg_kind : null,
      vehicleCategory:
        typeof leg.vehicle_category === "string" ? leg.vehicle_category : null,
      ...lineFields,
      subtotalPence: typeof pricing.subtotal_pence === "number" ? pricing.subtotal_pence : null,
      discountPence: typeof pricing.discount_pence === "number" ? pricing.discount_pence : null,
      multipliers,
      vatPence: typeof pricing.vat_pence === "number" ? pricing.vat_pence : null,
      totalPence: typeof pricing.total_pence === "number" ? pricing.total_pence : null,
    };
  });

  if (legs.every((leg) => leg.chargeLines.length === 0 && leg.freeExtrasCount === 0)) {
    return null;
  }

  return {
    source: "quote",
    calcSource: typeof meta.calc_source === "string" ? meta.calc_source : null,
    calcVersion: typeof meta.calc_version === "string" ? meta.calc_version : null,
    tripContext: readTripContext(meta),
    legs,
  };
}

export function extractPricingEngineFromIlfLegs(
  legFinancials: Array<Record<string, unknown>>
): PricingEngineBreakdown | null {
  if (legFinancials.length === 0) return null;

  const legs: PricingEngineLegBreakdown[] = legFinancials
    .map((row) => {
      const lineItems = row.line_items as Record<string, unknown> | undefined;
      const pricing = (lineItems?.pricing ?? {}) as Record<string, unknown>;
      const details = mapDetails(pricing.details);
      const components = mapComponents(lineItems?.components);
      const rawLines = details.length > 0 ? details : components;
      const lineFields = enrichLegLines(rawLines);

      return {
        legNumber: Number(row.leg_number) || 0,
        legKind: null,
        vehicleCategory:
          typeof lineItems?.vehicle_category_id === "string"
            ? lineItems.vehicle_category_id
            : null,
        ...lineFields,
        subtotalPence:
          typeof pricing.subtotal_pence === "number" ? pricing.subtotal_pence : null,
        discountPence:
          typeof pricing.discount_pence === "number" ? pricing.discount_pence : null,
        multipliers: {},
        vatPence: typeof pricing.vat_pence === "number" ? pricing.vat_pence : null,
        totalPence: typeof pricing.total_pence === "number" ? pricing.total_pence : null,
      };
    })
    .filter((leg) => leg.chargeLines.length > 0 || leg.freeExtrasCount > 0);

  if (legs.length === 0) return null;

  return {
    source: "ilf_snapshot",
    calcSource: "internal_leg_financials",
    calcVersion: null,
    tripContext: null,
    legs,
    missingReason: "Quote pricing details unavailable — showing ILF booking snapshot.",
  };
}

export function buildPricingEngineBreakdown(input: {
  quote: Record<string, unknown> | null;
  legFinancials: Array<Record<string, unknown>>;
}): PricingEngineBreakdown {
  const fromQuote = input.quote
    ? extractPricingEngineFromQuote(input.quote.line_items)
    : null;
  if (fromQuote) return fromQuote;

  const fromIlf = extractPricingEngineFromIlfLegs(input.legFinancials);
  if (fromIlf) return fromIlf;

  return {
    source: null,
    calcSource: null,
    calcVersion: null,
    tripContext: null,
    legs: [],
    missingReason: "No pricing engine breakdown stored on quote or leg financials.",
  };
}
