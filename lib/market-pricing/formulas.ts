import type {
  CompetitorGap,
  MarketCompetitor,
  MarketPosition,
  MarketStats,
  PriceRecommendations,
} from "./types";
import { formatDelta, formatPct } from "./format";

/** Median of a sorted array */
function median(sorted: number[]): number | null {
  if (sorted.length === 0) return null;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? Math.round((sorted[mid - 1] + sorted[mid]) / 2)
    : sorted[mid];
}

/** Compute min / max / median / mean from competitor prices */
export function computeStats(competitorPrices: number[]): MarketStats & { sorted: number[] } {
  if (competitorPrices.length === 0) {
    return { min_pence: null, max_pence: null, median_pence: null, mean_pence: null, count: 0, cheapest_competitor_name: null, sorted: [] };
  }
  const sorted = [...competitorPrices].sort((a, b) => a - b);
  const min_pence = sorted[0];
  const max_pence = sorted[sorted.length - 1];
  const median_pence = median(sorted);
  const mean_pence = Math.round(sorted.reduce((s, v) => s + v, 0) / sorted.length);
  return { min_pence, max_pence, median_pence, mean_pence, count: sorted.length, cheapest_competitor_name: null, sorted };
}

/** Compute gap vs each competitor, sorted cheapest first */
export function computeGaps(
  vlActualPence: number | null,
  competitors: Array<{ competitor: MarketCompetitor; amount_pence: number }>
): CompetitorGap[] {
  if (vlActualPence == null || competitors.length === 0) return [];
  return competitors
    .map((c) => ({
      competitor: c.competitor,
      amount_pence: c.amount_pence,
      rank: 0,
      delta_pence: vlActualPence - c.amount_pence,
      delta_pct: ((vlActualPence / c.amount_pence) - 1) * 100,
      label: "",
      to_equal_pence: Math.abs(vlActualPence - c.amount_pence),
      vl_is_cheaper: vlActualPence < c.amount_pence,
    }))
    .sort((a, b) => a.amount_pence - b.amount_pence)
    .map((g, i) => ({
      ...g,
      rank: i + 1,
      label: `${formatDelta(g.delta_pence)} (${formatPct(g.delta_pct)})`,
    }));
}

/** Recommendations vs MIN */
export function computeRecommendations(
  stats: MarketStats,
  aggressivePct: number = 0.95,
  premiumPct: number = 1.10
): PriceRecommendations {
  if (stats.min_pence == null) {
    return { match_min_pence: null, match_median_pence: null, match_max_pence: null, aggressive_pence: null, premium_pence: null };
  }
  return {
    match_min_pence: stats.min_pence,
    match_median_pence: stats.median_pence,
    match_max_pence: stats.max_pence,
    aggressive_pence: Math.round(stats.min_pence * aggressivePct),
    premium_pence: Math.round(stats.min_pence * premiumPct),
  };
}

/** Position vs market min */
export function computePosition(
  vlPence: number | null,
  minPence: number | null,
  tolerancePence: number = 100
): MarketPosition | null {
  if (vlPence == null || minPence == null) return null;
  const delta = vlPence - minPence;
  if (delta <= tolerancePence) return "cheaper";
  const pct = delta / minPence;
  if (pct <= 0.05) return "in_line";
  if (pct <= 0.15) return "premium";
  return "expensive";
}

export const POSITION_CONFIG: Record<MarketPosition, { label: string; color: string; badge: string }> = {
  cheaper: { label: "Cheaper", color: "text-green-400", badge: "success" },
  in_line: { label: "In line", color: "text-blue-400", badge: "default" },
  premium: { label: "Premium", color: "text-amber-400", badge: "warning" },
  expensive: { label: "Expensive", color: "text-red-400", badge: "destructive" },
};
