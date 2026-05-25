/**
 * Admin-only VAT preview math (UI layer). Does not affect DB saves or pricing engine.
 * Consumes organization_settings.vat_rate_percent from the Prices page.
 */

import type { ColDef } from "@/components/pricing/pricingAdminColumns";

export function parseNetPoundsInput(input: string): number | null {
  const n = parseFloat(String(input).replace(/,/g, "").trim());
  if (Number.isNaN(n) || n < 0) return null;
  return n;
}

export function netPoundsToPence(pounds: number): number {
  return Math.round(pounds * 100);
}

export function computeVatPreviewFromNetPounds(
  netPounds: number,
  vatRatePercent: number
): { netPence: number; vatPence: number; grossPence: number } | null {
  if (netPounds < 0 || Number.isNaN(netPounds)) return null;
  const netPence = netPoundsToPence(netPounds);
  const vatPence =
    vatRatePercent > 0 ? Math.round(netPence * (vatRatePercent / 100)) : 0;
  return { netPence, vatPence, grossPence: netPence + vatPence };
}

export function formatPenceGBP(pence: number): string {
  return `£${(pence / 100).toFixed(2)}`;
}

export function hasPenceColumns(cols: ColDef[]): boolean {
  return cols.some((c) => c.type === "pence");
}

/** Wider cells when stacked VAT helper is shown under inputs */
export const PENCE_COLUMN_MIN_WIDTH = "172px";
