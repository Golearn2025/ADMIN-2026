/**
 * ECB reference rates via Frankfurter (no API key).
 * Used to normalize OpEx KPIs to GBP (UK functional currency).
 */

type RateCacheKey = string;

const memoryRates = new Map<RateCacheKey, number>();

function cacheKey(date: string, from: string, to: string): RateCacheKey {
  return `${date}|${from}|${to}`;
}

function normalizeCurrency(code: string | null | undefined): string {
  return (code || "GBP").trim().toUpperCase();
}

/** Frankfurter has no weekend data — walk back up to 10 days. */
async function fetchFrankfurterRate(
  from: string,
  to: string,
  onDate: string
): Promise<{ rate: number; asOf: string }> {
  let date = onDate.slice(0, 10);
  for (let i = 0; i < 10; i++) {
    const key = cacheKey(date, from, to);
    const cached = memoryRates.get(key);
    if (cached != null) return { rate: cached, asOf: date };

    const url = `https://api.frankfurter.dev/v1/${date}?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
    const res = await fetch(url, { redirect: "follow" });
    if (res.ok) {
      const json = (await res.json()) as {
        date?: string;
        rates?: Record<string, number>;
      };
      const rate = json.rates?.[to];
      if (typeof rate === "number" && rate > 0) {
        const asOf = (json.date || date).slice(0, 10);
        memoryRates.set(cacheKey(asOf, from, to), rate);
        memoryRates.set(key, rate);
        return { rate, asOf };
      }
    }
    // step back one calendar day
    const d = new Date(`${date}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() - 1);
    date = d.toISOString().slice(0, 10);
  }
  throw new Error(`No FX rate ${from}->${to} near ${onDate}`);
}

export async function getFxRateToGbp(
  fromCurrency: string,
  onDate: string
): Promise<{ rate: number; asOf: string }> {
  const from = normalizeCurrency(fromCurrency);
  if (from === "GBP") return { rate: 1, asOf: onDate.slice(0, 10) };
  return fetchFrankfurterRate(from, "GBP", onDate.slice(0, 10));
}

/** Convert minor units (cents/pence) into GBP pence using rate on/near date. */
export async function toGbpPence(
  amountMinor: number,
  currency: string,
  onDate: string
): Promise<{ amountGbpPence: number; fxRateToGbp: number; fxAsOf: string }> {
  const from = normalizeCurrency(currency);
  const amount = Math.round(Number(amountMinor) || 0);
  if (from === "GBP") {
    return { amountGbpPence: amount, fxRateToGbp: 1, fxAsOf: onDate.slice(0, 10) };
  }
  const { rate, asOf } = await getFxRateToGbp(from, onDate);
  return {
    amountGbpPence: Math.round(amount * rate),
    fxRateToGbp: rate,
    fxAsOf: asOf,
  };
}
