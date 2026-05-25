/** Read-only booking economics DTO — values come from DB as stored, no recalculation. */

import type { PricingEngineBreakdown } from "./extract-pricing-engine-breakdown";

export type { PricingEngineBreakdown };

export type EconomicsMoneyField = {
  pence: number | null;
  label: string;
};

export type EconomicsLegMarketplace = {
  legNumber: number;
  driverOfferPence: number | null;
  lockedSettlementPence: number | null;
  acceptedAt: string | null;
  tierFactor: number | null;
};

export type BookingEconomicsResponse = {
  bookingId: string;
  reference: string | null;
  hasFinancialSnapshot: boolean;
  customerQuote: {
    source: "economics_snapshot" | "quote_leg_pricing" | null;
    clientTotalPence: number | null;
    vatPence: number | null;
    clientNetPence: number | null;
    quotedAt: string | null;
    missingReason?: string;
  };
  driverMarketplace: {
    legs: EconomicsLegMarketplace[];
    totals: {
      driverOfferPence: number | null;
      lockedSettlementPence: number | null;
      extrasPayoutPence: number | null;
      driverVisiblePence: number | null;
    };
    hasLockedSettlement: boolean;
  };
  accountingSnapshot: {
    source: "admin_booking_financial_breakdown" | null;
    platformFeePence: number | null;
    operatorFeePence: number | null;
    grossMarginPence: number | null;
    stripeEstimatePence: number | null;
    stripeActualPence: number | null;
    netMarginPence: number | null;
    financialVersion: number | null;
    pricingSource: string | null;
    calculatedAt: string | null;
    paymentStatus: string | null;
    missingReason?: string;
  };
  operationalEstimate: {
    source: "economics_snapshot" | null;
    operationalReservePence: number | null;
    estimatedProcessorFeePence: number | null;
    estimatedOperatingProfitPence: number | null;
    missingReason?: string;
  };
  pricingEngine: PricingEngineBreakdown;
};
