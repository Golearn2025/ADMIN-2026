import type { BookingEconomicsResponse, EconomicsLegMarketplace } from "./types";

type AcceptanceSnapshot = {
  payout_pence?: number;
  snapshotted_at?: string;
  tier_factor?: number;
};

type EconomicsSnapshot = {
  client_gross_pence?: number;
  vat_pence?: number;
  client_net_pence?: number;
  generated_at?: string;
  estimated_processor_fee_pence?: number;
  operational_reserve_pence?: number;
  retained_net_pence?: number;
};

type QuoteLegPricing = {
  total_pence?: number;
  vat_pence?: number;
  subtotal_pence?: number;
};

function readEconomicsSnapshot(lineItems: unknown): EconomicsSnapshot | null {
  if (!lineItems || typeof lineItems !== "object") return null;
  const root = lineItems as Record<string, unknown>;
  const meta = root.meta as Record<string, unknown> | undefined;
  const fromMeta = meta?.economics_snapshot;
  const fromRoot = root.economics_snapshot;
  const raw = (fromMeta ?? fromRoot) as EconomicsSnapshot | undefined;
  return raw && typeof raw === "object" ? raw : null;
}

function readQuoteLegPricing(lineItems: unknown): QuoteLegPricing | null {
  if (!lineItems || typeof lineItems !== "object") return null;
  const meta = (lineItems as Record<string, unknown>).meta as Record<string, unknown> | undefined;
  const legs = meta?.legs;
  if (!Array.isArray(legs) || legs.length === 0) return null;
  const firstLeg = legs[0] as Record<string, unknown>;
  const pricing = firstLeg?.pricing as QuoteLegPricing | undefined;
  return pricing && typeof pricing === "object" ? pricing : null;
}

function mapLegMarketplace(row: Record<string, unknown>): EconomicsLegMarketplace {
  const acceptance = (row.line_items as Record<string, unknown> | null)?.acceptance_snapshot as
    | AcceptanceSnapshot
    | undefined;

  return {
    legNumber: Number(row.leg_number) || 0,
    driverOfferPence:
      typeof row.driver_target_payout_pence === "number"
        ? row.driver_target_payout_pence
        : typeof row.driver_estimated_payout_pence === "number"
          ? row.driver_estimated_payout_pence
          : null,
    lockedSettlementPence:
      typeof acceptance?.payout_pence === "number" ? acceptance.payout_pence : null,
    acceptedAt: acceptance?.snapshotted_at ?? null,
    tierFactor: typeof acceptance?.tier_factor === "number" ? acceptance.tier_factor : null,
  };
}

function sumField(legs: EconomicsLegMarketplace[], key: keyof EconomicsLegMarketplace): number | null {
  const values = legs.map((l) => l[key]).filter((v): v is number => typeof v === "number");
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0);
}

export function buildBookingEconomics(input: {
  bookingId: string;
  breakdown: Record<string, unknown> | null;
  internalFinancial: Record<string, unknown> | null;
  quote: Record<string, unknown> | null;
  legFinancials: Array<Record<string, unknown>>;
}): BookingEconomicsResponse {
  const { bookingId, breakdown, internalFinancial, quote, legFinancials } = input;
  const economicsSnapshot = quote ? readEconomicsSnapshot(quote.line_items) : null;
  const quoteLegPricing = quote ? readQuoteLegPricing(quote.line_items) : null;

  const customerQuote = economicsSnapshot
    ? {
        source: "economics_snapshot" as const,
        clientTotalPence: economicsSnapshot.client_gross_pence ?? null,
        vatPence: economicsSnapshot.vat_pence ?? null,
        clientNetPence: economicsSnapshot.client_net_pence ?? null,
        quotedAt: economicsSnapshot.generated_at ?? (quote?.created_at as string) ?? null,
      }
    : quoteLegPricing
      ? {
          source: "quote_leg_pricing" as const,
          clientTotalPence: quoteLegPricing.total_pence ?? null,
          vatPence: quoteLegPricing.vat_pence ?? null,
          clientNetPence: quoteLegPricing.subtotal_pence ?? null,
          quotedAt: (quote?.created_at as string) ?? null,
          missingReason:
            "economics_snapshot not on quote yet — showing quote leg pricing (read-only fallback).",
        }
      : {
          source: null,
          clientTotalPence: (breakdown?.gross_amount_pence as number | null) ?? null,
          vatPence: (breakdown?.vat_amount_pence as number | null) ?? null,
          clientNetPence: (breakdown?.subtotal_ex_vat_pence as number | null) ?? null,
          quotedAt: null,
          missingReason: "No quote economics_snapshot or quote pricing available.",
        };

  const legs = legFinancials.map(mapLegMarketplace);
  const lockedSum = sumField(legs, "lockedSettlementPence");
  const offerSum = sumField(legs, "driverOfferPence");
  const extrasPayout =
    typeof internalFinancial?.driver_extras_payout_pence === "number"
      ? internalFinancial.driver_extras_payout_pence
      : null;
  const hasLockedSettlement = legs.some((l) => l.lockedSettlementPence !== null);
  const driverVisibleBase = hasLockedSettlement ? lockedSum : offerSum;

  const driverMarketplace = {
    legs,
    totals: {
      driverOfferPence: offerSum,
      lockedSettlementPence: lockedSum,
      extrasPayoutPence: extrasPayout,
      driverVisiblePence:
        driverVisibleBase !== null || extrasPayout !== null
          ? (driverVisibleBase ?? 0) + (extrasPayout ?? 0)
          : null,
    },
    hasLockedSettlement,
  };

  const hasFinancialSnapshot = Boolean(breakdown?.financial_id ?? internalFinancial?.id);

  const accountingSnapshot = hasFinancialSnapshot
    ? {
        source: "admin_booking_financial_breakdown" as const,
        platformFeePence: (breakdown?.platform_fee_pence as number) ?? null,
        operatorFeePence: (breakdown?.operator_fee_pence as number) ?? null,
        grossMarginPence: (internalFinancial?.gross_margin_pence as number) ?? null,
        stripeEstimatePence: economicsSnapshot?.estimated_processor_fee_pence ?? null,
        stripeActualPence: (breakdown?.processor_fee_pence as number) ?? null,
        netMarginPence: (internalFinancial?.net_margin_pence as number) ?? null,
        financialVersion: (breakdown?.financial_version as number) ?? null,
        pricingSource: (breakdown?.pricing_source as string) ?? null,
        calculatedAt: (breakdown?.calculated_at as string) ?? null,
        paymentStatus: (breakdown?.payment_status as string) ?? null,
      }
    : {
        source: null,
        platformFeePence: null,
        operatorFeePence: null,
        grossMarginPence: null,
        stripeEstimatePence: economicsSnapshot?.estimated_processor_fee_pence ?? null,
        stripeActualPence: null,
        netMarginPence: null,
        financialVersion: null,
        pricingSource: null,
        calculatedAt: null,
        paymentStatus: null,
        missingReason: "No internal_booking_financials snapshot for this booking.",
      };

  const operationalEstimate = economicsSnapshot
    ? {
        source: "economics_snapshot" as const,
        operationalReservePence: economicsSnapshot.operational_reserve_pence ?? null,
        estimatedProcessorFeePence: economicsSnapshot.estimated_processor_fee_pence ?? null,
        estimatedOperatingProfitPence: economicsSnapshot.retained_net_pence ?? null,
      }
    : {
        source: null,
        operationalReservePence: null,
        estimatedProcessorFeePence: null,
        estimatedOperatingProfitPence: null,
        missingReason:
          "economics_snapshot not persisted on quote yet (Phase 1C). Operational estimate unavailable.",
      };

  return {
    bookingId,
    reference: (breakdown?.reference as string) ?? null,
    hasFinancialSnapshot,
    customerQuote,
    driverMarketplace,
    accountingSnapshot,
    operationalEstimate,
  };
}
