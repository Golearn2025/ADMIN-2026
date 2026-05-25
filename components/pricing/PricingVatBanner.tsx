"use client";

import { Receipt } from "lucide-react";

/**
 * Tab-level note: admin inputs are NET; preview shows what the website client pays incl. VAT.
 */
export function PricingVatBanner({ vatRatePercent }: { vatRatePercent: number }) {
  return (
    <div className="mb-3 flex gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-muted-foreground">
      <Receipt className="h-3.5 w-3.5 shrink-0 text-primary mt-0.5" />
      <div className="space-y-0.5">
        <p>
          <span className="font-medium text-foreground">NET pricing model</span> — amounts you edit are
          ex-VAT (stored in DB). Below each £ field: NET, VAT, and{" "}
          <span className="font-medium text-primary">FINAL WEBSITE PRICE</span> incl. VAT at{" "}
          {vatRatePercent > 0 ? (
            <span className="font-mono text-foreground">{vatRatePercent}%</span>
          ) : (
            <span className="text-amber-600">not set — configure under VAT &amp; Commission</span>
          )}
          .
        </p>
        <p className="text-[10px] text-muted-foreground/90">
          Preview only. Does not change quotes, Stripe, or accounting.
        </p>
      </div>
    </div>
  );
}
