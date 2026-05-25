"use client";

import {
  computeVatPreviewFromNetPounds,
  formatPenceGBP,
  parseNetPoundsInput,
} from "@/components/pricing/pricingVatPreview";

/**
 * UI-only VAT preview under NET pricing inputs (admin). Does not change saved values or engine math.
 */
export function PenceWithVatPreview({
  netInput,
  vatRatePercent,
  className = "",
}: {
  netInput: string;
  vatRatePercent: number;
  className?: string;
}) {
  const netPounds = parseNetPoundsInput(netInput);
  if (netPounds === null) return null;

  if (!vatRatePercent || vatRatePercent <= 0) {
    return (
      <p className={`mt-1.5 text-[10px] text-muted-foreground ${className}`}>
        NET {formatPenceGBP(Math.round(netPounds * 100))} — set VAT % under{" "}
        <span className="font-medium">VAT &amp; Commission</span> to see website price.
      </p>
    );
  }

  const preview = computeVatPreviewFromNetPounds(netPounds, vatRatePercent);
  if (!preview) return null;

  return (
    <div
      className={`mt-1.5 rounded-md border border-border/50 bg-muted/25 px-2 py-1.5 space-y-0.5 text-[10px] leading-snug ${className}`}
      aria-live="polite"
    >
      <p className="text-muted-foreground">
        <span className="font-medium text-foreground/80">NET</span>{" "}
        <span className="font-mono text-foreground">{formatPenceGBP(preview.netPence)}</span>
      </p>
      <p className="text-muted-foreground">
        <span className="font-medium text-foreground/80">VAT</span>{" "}
        <span className="font-mono text-foreground">{formatPenceGBP(preview.vatPence)}</span>
        <span className="text-muted-foreground/80"> ({vatRatePercent}%)</span>
      </p>
      <p className="font-medium text-primary">
        <span className="text-primary/90">FINAL WEBSITE PRICE</span>{" "}
        <span className="font-mono">{formatPenceGBP(preview.grossPence)}</span>
        <span className="font-normal text-primary/80"> incl. VAT</span>
      </p>
    </div>
  );
}
