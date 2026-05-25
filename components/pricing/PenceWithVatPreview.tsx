"use client";

/**
 * UI-only VAT preview for admin pricing fields (does not affect backend calculations).
 */

function parseNetPence(input: string): number | null {
  const n = parseFloat(input.replace(/,/g, ""));
  if (Number.isNaN(n) || n < 0) return null;
  return Math.round(n * 100);
}

export function PenceWithVatPreview({
  netInput,
  vatRatePercent,
  className = "",
}: {
  netInput: string;
  vatRatePercent: number;
  className?: string;
}) {
  if (!vatRatePercent || vatRatePercent <= 0) return null;

  const netPence = parseNetPence(netInput);
  if (netPence === null) return null;

  const vatPence = Math.round(netPence * (vatRatePercent / 100));
  const grossPence = netPence + vatPence;

  const fmt = (p: number) => `£${(p / 100).toFixed(2)}`;

  return (
    <div className={`mt-1 space-y-0.5 text-[10px] leading-tight text-muted-foreground ${className}`}>
      <div className="flex flex-wrap gap-x-2 gap-y-0">
        <span>
          <span className="text-foreground/70">NET</span> {fmt(netPence)}
        </span>
        <span>
          <span className="text-foreground/70">VAT {vatRatePercent}%</span> {fmt(vatPence)}
        </span>
        <span className="font-medium text-primary">
          <span className="text-primary/80">FINAL WEBSITE PRICE</span> {fmt(grossPence)}
        </span>
      </div>
    </div>
  );
}
