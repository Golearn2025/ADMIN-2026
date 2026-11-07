import type { CostCadence, OperatingCostRow } from "@/lib/operating-costs/types";

export type UpcomingRenewal = {
  id: string;
  vendor_name: string;
  description: string | null;
  amount_pence: number;
  currency: string;
  cadence: CostCadence;
  last_paid_date: string;
  next_renewal_date: string;
  days_until: number;
  payment_status: "paid" | "unpaid";
};

function parseDate(iso: string): Date {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function toIso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function addMonths(d: Date, months: number): Date {
  const out = new Date(d.getTime());
  const day = out.getUTCDate();
  out.setUTCMonth(out.getUTCMonth() + months);
  // clamp month overflow (e.g. Jan 31 + 1 month)
  if (out.getUTCDate() < day) out.setUTCDate(0);
  return out;
}

function addDays(d: Date, days: number): Date {
  const out = new Date(d.getTime());
  out.setUTCDate(out.getUTCDate() + days);
  return out;
}

/** Advance one billing period from `from`. */
export function advanceByCadence(
  from: Date,
  cadence: CostCadence,
  amortizeMonths?: number | null
): Date {
  switch (cadence) {
    case "daily":
      return addDays(from, 1);
    case "weekly":
      return addDays(from, 7);
    case "monthly":
      return addMonths(from, 1);
    case "yearly":
      return addMonths(from, 12);
    case "multi_year":
      return addMonths(from, amortizeMonths && amortizeMonths > 0 ? amortizeMonths : 12);
    case "one_time":
    default:
      return from;
  }
}

/**
 * Next renewal on/after `today` (UTC date), stepping from start_date by cadence.
 * Returns null for one_time.
 */
export function computeNextRenewalDate(
  startDate: string,
  cadence: CostCadence,
  opts?: { today?: string; amortizeMonths?: number | null; endDate?: string | null }
): string | null {
  if (cadence === "one_time") return null;
  const today = parseDate(opts?.today || new Date().toISOString().slice(0, 10));
  let cursor = parseDate(startDate);
  // If start is in the future, that's the next (or first) charge date
  if (cursor >= today) return toIso(cursor);

  let guard = 0;
  while (cursor < today && guard < 600) {
    cursor = advanceByCadence(cursor, cadence, opts?.amortizeMonths);
    guard += 1;
  }
  if (opts?.endDate) {
    const end = parseDate(opts.endDate);
    if (cursor > end) return null;
  }
  return toIso(cursor);
}

function daysBetween(fromIso: string, toIso: string): number {
  const a = parseDate(fromIso).getTime();
  const b = parseDate(toIso).getTime();
  return Math.round((b - a) / 86_400_000);
}

/**
 * One upcoming renewal per vendor (latest recurring row wins).
 * Looks at active costs with non-one_time cadence.
 */
export function buildUpcomingRenewals(
  costs: OperatingCostRow[],
  opts?: { withinDays?: number; today?: string }
): UpcomingRenewal[] {
  const today = opts?.today || new Date().toISOString().slice(0, 10);
  const within = opts?.withinDays ?? 90;

  const recurring = costs.filter(
    (c) => c.status === "active" && c.cadence !== "one_time"
  );

  // Prefer latest start_date per vendor+cadence
  const best = new Map<string, OperatingCostRow>();
  for (const row of recurring) {
    const key = `${row.vendor_name.toLowerCase()}|${row.cadence}|${row.currency}`;
    const prev = best.get(key);
    if (!prev || row.start_date > prev.start_date) best.set(key, row);
  }

  const out: UpcomingRenewal[] = [];
  for (const row of best.values()) {
    const next = computeNextRenewalDate(row.start_date, row.cadence, {
      today,
      amortizeMonths: row.amortize_months,
      endDate: row.end_date,
    });
    if (!next) continue;
    const days = daysBetween(today, next);
    if (days < 0 || days > within) continue;
    out.push({
      id: row.id,
      vendor_name: row.vendor_name,
      description: row.description,
      amount_pence: row.amount_pence,
      currency: row.currency,
      cadence: row.cadence,
      last_paid_date: row.start_date,
      next_renewal_date: next,
      days_until: days,
      payment_status: row.payment_status || "paid",
    });
  }

  return out.sort((a, b) => a.next_renewal_date.localeCompare(b.next_renewal_date));
}
