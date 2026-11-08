import { toGbpPence } from "@/lib/operating-costs/fx";
import type { OperatingCostRow, OperatingCostSummary } from "@/lib/operating-costs/types";

export type CostWithGbp = OperatingCostRow & {
  amount_gbp_pence: number;
  fx_rate_to_gbp: number | null;
  fx_as_of: string | null;
  monthly_equivalent_gbp_pence: number;
};

function monthlyFromGbp(
  amountGbpPence: number,
  cadence: string,
  amortizeMonths: number | null
): number {
  if (amortizeMonths != null && amortizeMonths > 0) {
    return Math.round(amountGbpPence / amortizeMonths);
  }
  switch (cadence) {
    case "daily":
      return Math.round(amountGbpPence * 30.4375);
    case "weekly":
      return Math.round((amountGbpPence * 52) / 12);
    case "monthly":
      return amountGbpPence;
    case "yearly":
      return Math.round(amountGbpPence / 12);
    default:
      return 0;
  }
}

function dailyFromGbp(
  amountGbpPence: number,
  cadence: string,
  amortizeMonths: number | null
): number {
  if (amortizeMonths != null && amortizeMonths > 0) {
    return Math.round(amountGbpPence / (amortizeMonths * 30.4375));
  }
  switch (cadence) {
    case "daily":
      return amountGbpPence;
    case "weekly":
      return Math.round(amountGbpPence / 7);
    case "monthly":
      return Math.round(amountGbpPence / 30.4375);
    case "yearly":
      return Math.round(amountGbpPence / 365.25);
    default:
      return 0;
  }
}

/** Ensure amount_gbp_pence is set (ECB/Frankfurter on invoice date), persist if missing. */
export async function enrichCostsWithGbp(
  rows: OperatingCostRow[],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  admin?: any
): Promise<CostWithGbp[]> {
  const out: CostWithGbp[] = [];

  for (const row of rows) {
    const raw = row as CostWithGbp;
    const hasStoredGbp = typeof raw.amount_gbp_pence === "number" && raw.amount_gbp_pence != null;
    const isGbp = (row.currency || "GBP").toUpperCase() === "GBP";

    let amountGbpPence: number | null = hasStoredGbp
      ? raw.amount_gbp_pence
      : isGbp
        ? row.amount_pence
        : null;
    let fxRate = raw.fx_rate_to_gbp ?? (isGbp ? 1 : null);
    let fxAsOf = raw.fx_as_of ?? (isGbp ? row.start_date : null);

    if (!hasStoredGbp || (!isGbp && fxRate == null)) {
      try {
        const converted = await toGbpPence(
          row.amount_pence,
          row.currency,
          row.start_date || new Date().toISOString().slice(0, 10)
        );
        amountGbpPence = converted.amountGbpPence;
        fxRate = converted.fxRateToGbp;
        fxAsOf = converted.fxAsOf;

        if (admin) {
          await admin
            .from("operating_costs")
            .update({
              amount_gbp_pence: amountGbpPence,
              fx_rate_to_gbp: fxRate,
              fx_as_of: fxAsOf,
              updated_at: new Date().toISOString(),
            })
            .eq("id", row.id);
        }
      } catch (err) {
        console.warn("[fx] convert failed", row.id, row.currency, err);
        amountGbpPence = isGbp ? row.amount_pence : 0;
      }
    }

    const gbp = amountGbpPence ?? 0;
    out.push({
      ...row,
      amount_gbp_pence: gbp,
      fx_rate_to_gbp: fxRate,
      fx_as_of: fxAsOf,
      monthly_equivalent_gbp_pence: monthlyFromGbp(gbp, row.cadence, row.amortize_months),
      // Keep list "≈ / mo" column in GBP for KPI consistency
      monthly_equivalent_pence: monthlyFromGbp(gbp, row.cadence, row.amortize_months),
      daily_equivalent_pence: dailyFromGbp(gbp, row.cadence, row.amortize_months),
      yearly_equivalent_pence:
        monthlyFromGbp(gbp, row.cadence, row.amortize_months) * 12,
    });
  }

  return out;
}

/** Burn uses latest monthly period per vendor; all KPIs in GBP pence. */
export function buildGbpSummary(
  orgId: string,
  rows: CostWithGbp[]
): OperatingCostSummary & { fx_note: string } {
  const active = rows.filter((r) => r.status === "active");

  const latestMonthly = new Map<string, string>();
  for (const r of active) {
    if (r.cadence !== "monthly") continue;
    const key = `${r.vendor_name.toLowerCase()}|${(r.currency || "").toUpperCase()}`;
    const prev = latestMonthly.get(key);
    if (!prev || r.start_date > prev) latestMonthly.set(key, r.start_date);
  }

  const burnRows = active.filter((r) => {
    if (r.cadence !== "monthly") return true;
    const key = `${r.vendor_name.toLowerCase()}|${(r.currency || "").toUpperCase()}`;
    return r.start_date === latestMonthly.get(key);
  });

  const monthlyBurn = burnRows.reduce((s, r) => s + (r.monthly_equivalent_gbp_pence || 0), 0);
  const dailyBurn = burnRows.reduce((s, r) => s + (r.daily_equivalent_pence || 0), 0);
  const yearlyBurn = burnRows.reduce((s, r) => s + (r.yearly_equivalent_pence || 0), 0);

  const unpaid = rows.filter((r) => r.payment_status === "unpaid");

  return {
    organization_id: orgId,
    active_count: active.length,
    one_time_count: rows.filter((r) => r.cadence === "one_time").length,
    cash_spent_pence: rows.reduce((s, r) => s + (r.amount_gbp_pence || 0), 0),
    monthly_burn_pence: monthlyBurn,
    daily_burn_pence: dailyBurn,
    yearly_burn_pence: yearlyBurn,
    unpaid_pence: unpaid.reduce((s, r) => s + (r.amount_gbp_pence || 0), 0),
    unpaid_count: unpaid.length,
    fx_note: "Converted to GBP via ECB (Frankfurter) on invoice date",
  };
}
