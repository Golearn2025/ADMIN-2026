/**
 * Shared period parsing for dashboard API routes.
 * "all" means no created_at filter. Missing params default to last 30 days.
 */

export type DashboardPeriodQuery = {
  isAllTime: boolean;
  from?: string;
  to?: string;
};

export function parseDashboardPeriodQuery(
  searchParams: URLSearchParams
): DashboardPeriodQuery {
  const period = searchParams.get("period");
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  if (period === "all") {
    return { isAllTime: true };
  }

  if (from && to) {
    return { isAllTime: false, from, to };
  }

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  return {
    isAllTime: false,
    from: thirtyDaysAgo.toISOString(),
    to: new Date().toISOString(),
  };
}
