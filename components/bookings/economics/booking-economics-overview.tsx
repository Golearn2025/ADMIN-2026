"use client";

import { formatPenceGBP, formatTimestamp } from "@/lib/bookings/economics/format-pence";
import type { BookingEconomicsResponse } from "@/lib/bookings/economics/types";

type EconomicsFieldProps = {
  label: string;
  pence?: number | null;
  text?: string | null;
  emphasize?: boolean;
};

function EconomicsField({ label, pence, text, emphasize }: EconomicsFieldProps) {
  const value = text ?? formatPenceGBP(pence);
  return (
    <div className="flex items-start justify-between gap-3 py-1.5 border-b border-border/40 last:border-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span
        className={`text-xs text-right tabular-nums ${emphasize ? "font-semibold text-foreground" : "text-foreground"}`}
      >
        {value}
      </span>
    </div>
  );
}

type EconomicsSectionProps = {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  notice?: string;
};

function EconomicsSection({ title, subtitle, children, notice }: EconomicsSectionProps) {
  return (
    <section className="rounded-lg border border-border/60 bg-muted/10 p-3 sm:p-4 space-y-2">
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-foreground">{title}</h3>
        <p className="text-[11px] text-muted-foreground mt-0.5">{subtitle}</p>
      </div>
      {notice && (
        <p className="text-[11px] text-amber-700 dark:text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded px-2 py-1.5">
          {notice}
        </p>
      )}
      <div>{children}</div>
    </section>
  );
}

type BookingEconomicsOverviewProps = {
  data: BookingEconomicsResponse;
};

export function BookingEconomicsOverview({ data }: BookingEconomicsOverviewProps) {
  const { customerQuote, driverMarketplace, accountingSnapshot, operationalEstimate } = data;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
      <EconomicsSection
        title="Estimate at quote"
        subtitle="Customer quote — source: economics_snapshot"
        notice={customerQuote.missingReason}
      >
        <EconomicsField label="Client total" pence={customerQuote.clientTotalPence} emphasize />
        <EconomicsField label="VAT" pence={customerQuote.vatPence} />
        <EconomicsField label="Client net" pence={customerQuote.clientNetPence} />
        <EconomicsField label="Quote timestamp" text={formatTimestamp(customerQuote.quotedAt)} />
      </EconomicsSection>

      <EconomicsSection
        title="Marketplace payout"
        subtitle="Driver marketplace — ILF legs + acceptance_snapshot"
      >
        <EconomicsField
          label="Driver offer shown in app"
          pence={driverMarketplace.totals.driverOfferPence}
        />
        <EconomicsField
          label="Locked settlement payout"
          pence={driverMarketplace.totals.lockedSettlementPence}
          emphasize={driverMarketplace.hasLockedSettlement}
        />
        <EconomicsField label="Extras payout" pence={driverMarketplace.totals.extrasPayoutPence} />
        <EconomicsField
          label="Driver visible payout"
          pence={driverMarketplace.totals.driverVisiblePence}
          emphasize
        />
        {driverMarketplace.legs.length > 1 && (
          <div className="pt-2 space-y-1">
            <p className="text-[10px] font-medium text-muted-foreground uppercase">Per leg</p>
            {driverMarketplace.legs.map((leg) => (
              <p key={leg.legNumber} className="text-[11px] text-muted-foreground">
                Leg {leg.legNumber}: offer {formatPenceGBP(leg.driverOfferPence)}
                {leg.lockedSettlementPence !== null &&
                  ` · locked ${formatPenceGBP(leg.lockedSettlementPence)}`}
              </p>
            ))}
          </div>
        )}
      </EconomicsSection>

      <EconomicsSection
        title="Accounting snapshot"
        subtitle="internal_booking_financials · admin_booking_financial_breakdown"
        notice={accountingSnapshot.missingReason}
      >
        <EconomicsField label="Platform fee" pence={accountingSnapshot.platformFeePence} />
        <EconomicsField label="Operator fee" pence={accountingSnapshot.operatorFeePence} />
        <EconomicsField label="Gross margin" pence={accountingSnapshot.grossMarginPence} />
        <EconomicsField label="Stripe estimate" pence={accountingSnapshot.stripeEstimatePence} />
        <EconomicsField label="Stripe actual" pence={accountingSnapshot.stripeActualPence} emphasize />
        <EconomicsField label="Net margin" pence={accountingSnapshot.netMarginPence} />
        {accountingSnapshot.pricingSource && (
          <EconomicsField label="Pricing source" text={accountingSnapshot.pricingSource} />
        )}
        {accountingSnapshot.paymentStatus && (
          <EconomicsField label="Payment status" text={accountingSnapshot.paymentStatus} />
        )}
      </EconomicsSection>

      <EconomicsSection
        title="Operational estimate"
        subtitle="Quote-time operational profitability — source: economics_snapshot"
        notice={operationalEstimate.missingReason}
      >
        <EconomicsField
          label="Operational reserve"
          pence={operationalEstimate.operationalReservePence}
        />
        <EconomicsField
          label="Estimated processor fee"
          pence={operationalEstimate.estimatedProcessorFeePence}
        />
        <EconomicsField
          label="Estimated operating profit"
          pence={operationalEstimate.estimatedOperatingProfitPence}
          emphasize
        />
      </EconomicsSection>
    </div>
  );
}
