"use client";

import { formatPenceGBP } from "@/lib/bookings/economics/format-pence";
import type { PricingEngineBreakdown } from "@/lib/bookings/economics/extract-pricing-engine-breakdown";

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
        <span>
          Source: <span className="text-foreground">{breakdown.source}</span>
        </span>
      </div>

      {breakdown.missingReason && (
        <p className="text-[11px] text-amber-700 dark:text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded px-2 py-1.5">
          {breakdown.missingReason}
        </p>
      )}

      {breakdown.legs.map((leg) => (
        <div key={leg.legNumber} className="space-y-2">
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

          <div className="rounded-md border border-border/50 overflow-x-auto">
            <table className="w-full text-xs min-w-[320px]">
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
                {leg.lines.map((line, idx) => (
                  <tr
                    key={`${line.component}-${idx}`}
                    className="border-t border-border/30 even:bg-muted/5"
                  >
                    <td className="px-2 py-1.5 font-mono text-[10px] text-muted-foreground align-top">
                      {line.component}
                    </td>
                    <td className="px-2 py-1.5 text-foreground hidden sm:table-cell align-top">
                      {line.description}
                      <span className="sm:hidden block text-[10px] text-muted-foreground mt-0.5">
                        {line.component}
                      </span>
                    </td>
                    <td
                      className={`px-2 py-1.5 text-right tabular-nums align-top ${
                        line.amountPence === 0 ? "text-muted-foreground" : "text-foreground"
                      }`}
                    >
                      {formatPenceGBP(line.amountPence)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

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
      ))}
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
