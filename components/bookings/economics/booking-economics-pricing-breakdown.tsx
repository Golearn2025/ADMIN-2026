"use client";

import { formatPenceGBP, formatTimestamp } from "@/lib/bookings/economics/format-pence";
import type {
  PricingEngineBreakdown,
  PricingEngineLegBreakdown,
  PricingTripContext,
} from "@/lib/bookings/economics/extract-pricing-engine-breakdown";
import { MapPin, Clock } from "lucide-react";

type BookingEconomicsPricingBreakdownProps = {
  breakdown: PricingEngineBreakdown;
};

export function BookingEconomicsPricingBreakdown({
  breakdown,
}: BookingEconomicsPricingBreakdownProps) {
  if (breakdown.source === null || breakdown.legs.length === 0) {
    return (
      <p className="text-xs text-muted-foreground italic py-2">
        {breakdown.missingReason ?? "No pricing engine breakdown available."}
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
        {breakdown.calcSource && (
          <span>
            Engine: <span className="font-mono text-foreground">{breakdown.calcSource}</span>
          </span>
        )}
        {breakdown.calcVersion && (
          <span>
            Version: <span className="font-mono text-foreground">{breakdown.calcVersion}</span>
          </span>
        )}
      </div>

      {breakdown.tripContext && <TripContextStrip context={breakdown.tripContext} />}

      {breakdown.missingReason && (
        <p className="text-[11px] text-amber-700 dark:text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded px-2 py-1.5">
          {breakdown.missingReason}
        </p>
      )}

      {breakdown.legs.map((leg) => (
        <LegPricingTable key={leg.legNumber} leg={leg} />
      ))}
    </div>
  );
}

function TripContextStrip({ context }: { context: PricingTripContext }) {
  return (
    <div className="rounded-lg border border-border/50 bg-muted/10 p-3 space-y-2 text-xs">
      <div className="flex items-start gap-2">
        <MapPin className="h-3.5 w-3.5 shrink-0 text-muted-foreground mt-0.5" aria-hidden />
        <div className="min-w-0 space-y-1">
          {context.pickupAddress && (
            <p>
              <span className="text-muted-foreground">Pickup: </span>
              <span className="text-foreground">{context.pickupAddress}</span>
            </p>
          )}
          {context.dropoffAddress && (
            <p>
              <span className="text-muted-foreground">Dropoff: </span>
              <span className="text-foreground">{context.dropoffAddress}</span>
            </p>
          )}
        </div>
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-muted-foreground">
        {context.scheduledAt && (
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3 w-3" aria-hidden />
            {formatTimestamp(context.scheduledAt)}
          </span>
        )}
        {context.bookingType && (
          <span>
            Type: <span className="text-foreground capitalize">{context.bookingType}</span>
          </span>
        )}
        {context.hours != null && context.hours > 0 && (
          <span>
            Hours: <span className="text-foreground">{context.hours}h</span>
          </span>
        )}
        {context.distanceMiles != null && context.distanceMiles > 0 && (
          <span>
            Distance: <span className="text-foreground">{context.distanceMiles} mi</span>
          </span>
        )}
        {context.durationMinutes != null && context.durationMinutes > 0 && (
          <span>
            Duration: <span className="text-foreground">{context.durationMinutes} min</span>
          </span>
        )}
      </div>
    </div>
  );
}

function LegPricingTable({ leg }: { leg: PricingEngineLegBreakdown }) {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-xs font-semibold text-foreground">
          Leg {leg.legNumber}
          {leg.legKind ? ` · ${leg.legKind}` : ""}
        </p>
        {leg.vehicleCategory && (
          <span className="text-[10px] uppercase tracking-wide text-muted-foreground bg-muted/40 px-1.5 py-0.5 rounded">
            {leg.vehicleCategory}
          </span>
        )}
      </div>

      {leg.chargeLines.length === 0 ? (
        <p className="text-xs text-muted-foreground italic">No chargeable fare components.</p>
      ) : (
        <div className="rounded-md border border-border/50 overflow-x-auto">
          <table className="w-full text-xs min-w-[280px]">
            <thead>
              <tr className="bg-muted/30 text-muted-foreground">
                <th className="text-left font-medium px-2 py-1.5">Component</th>
                <th className="text-left font-medium px-2 py-1.5 hidden sm:table-cell">
                  Description
                </th>
                <th className="text-right font-medium px-2 py-1.5 w-24">Amount</th>
              </tr>
            </thead>
            <tbody>
              {leg.chargeLines.map((line, idx) => (
                <tr
                  key={`${line.component}-${idx}`}
                  className="border-t border-border/30 even:bg-muted/5"
                >
                  <td className="px-2 py-1.5 font-mono text-[10px] text-muted-foreground align-top">
                    {line.component}
                  </td>
                  <td className="px-2 py-1.5 text-foreground hidden sm:table-cell align-top">
                    {line.description}
                  </td>
                  <td className="px-2 py-1.5 text-right tabular-nums font-medium text-foreground align-top">
                    {formatPenceGBP(line.amountPence)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {leg.freeExtrasCount > 0 && (
        <p className="text-[11px] text-muted-foreground px-1">
          + {leg.freeExtrasCount} included catalog extra{leg.freeExtrasCount === 1 ? "" : "s"}{" "}
          (£0 — hidden, see Prices → Extras Items)
        </p>
      )}

      {Object.keys(leg.multipliers).length > 0 && (
        <div className="text-[11px] text-muted-foreground px-1">
          Multipliers:{" "}
          {Object.entries(leg.multipliers).map(([key, value]) => (
            <span key={key} className="mr-2 font-mono">
              {key}={value}x
            </span>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 px-1">
        <SummaryChip label="Subtotal" pence={leg.subtotalPence} />
        <SummaryChip label="Discount" pence={leg.discountPence} />
        <SummaryChip label="VAT" pence={leg.vatPence} />
        <SummaryChip label="Client total" pence={leg.totalPence} emphasize />
      </div>
    </div>
  );
}

function SummaryChip({
  label,
  pence,
  emphasize,
}: {
  label: string;
  pence: number | null;
  emphasize?: boolean;
}) {
  return (
    <div className="rounded border border-border/40 bg-muted/10 px-2 py-1.5">
      <p className="text-[10px] text-muted-foreground">{label}</p>
      <p
        className={`text-xs tabular-nums ${emphasize ? "font-semibold text-foreground" : "text-foreground"}`}
      >
        {formatPenceGBP(pence)}
      </p>
    </div>
  );
}
