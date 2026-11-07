/**
 * Google Ads monthly spend → Operating Costs helpers.
 */
import { GoogleAdsApi } from "google-ads-api";

export type GoogleAdsMonthSpend = {
  invoiceMonth: string; // YYYYMM
  startDate: string; // YYYY-MM-01
  amountMajor: number;
  currency: string;
};

function requireEnv(name: string): string {
  const v = process.env[name]?.trim();
  if (!v) throw new Error(`${name} missing in server env`);
  return v;
}

export function getGoogleAdsConfig() {
  return {
    clientId: process.env.GOOGLE_ADS_CLIENT_ID?.trim() || "",
    clientSecret: process.env.GOOGLE_ADS_CLIENT_SECRET?.trim() || "",
    refreshToken: process.env.GOOGLE_ADS_REFRESH_TOKEN?.trim() || "",
    developerToken: process.env.GOOGLE_ADS_DEVELOPER_TOKEN?.trim() || "",
    customerId: (process.env.GOOGLE_ADS_CUSTOMER_ID || "").replace(/-/g, ""),
    loginCustomerId: (process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID || "").replace(/-/g, ""),
  };
}

export function googleAdsConfigured(): boolean {
  const c = getGoogleAdsConfig();
  return Boolean(
    c.clientId &&
      c.clientSecret &&
      c.refreshToken &&
      c.developerToken &&
      c.customerId
  );
}

function microsToMajor(micros: string | number | null | undefined): number {
  const n = Number(micros || 0);
  if (!Number.isFinite(n)) return 0;
  return n / 1_000_000;
}

function monthToStartDate(ym: string): string {
  // API may return YYYY-MM-01 or YYYY-MM
  const m = String(ym).slice(0, 7);
  if (/^\d{4}-\d{2}$/.test(m)) return `${m}-01`;
  if (/^\d{6}$/.test(ym)) return `${ym.slice(0, 4)}-${ym.slice(4, 6)}-01`;
  return new Date().toISOString().slice(0, 10);
}

function toYm(startDate: string): string {
  return startDate.slice(0, 7).replace("-", "");
}

/**
 * Account-level cost by calendar month (last ~24 months via date range).
 */
export async function fetchGoogleAdsMonthlySpend(): Promise<{
  rows: GoogleAdsMonthSpend[];
  currency: string;
}> {
  const cfg = getGoogleAdsConfig();
  if (!googleAdsConfigured()) {
    throw new Error(
      "Google Ads OAuth incomplete — set CLIENT_ID, CLIENT_SECRET, REFRESH_TOKEN"
    );
  }

  const client = new GoogleAdsApi({
    client_id: cfg.clientId,
    client_secret: cfg.clientSecret,
    developer_token: cfg.developerToken,
  });

  const customer = client.Customer({
    customer_id: cfg.customerId,
    login_customer_id: cfg.loginCustomerId || undefined,
    refresh_token: cfg.refreshToken,
  });

  // Customer-level metrics by month (explicit range — LAST_365_DAYS not always valid)
  const end = new Date();
  const start = new Date();
  start.setFullYear(start.getFullYear() - 1);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  const gaql = `
    SELECT
      segments.month,
      customer.currency_code,
      metrics.cost_micros
    FROM customer
    WHERE segments.date BETWEEN '${fmt(start)}' AND '${fmt(end)}'
  `;

  const results = await customer.query(gaql);
  const byMonth = new Map<string, { micros: number; currency: string }>();

  for (const row of results as Array<{
    segments?: { month?: string };
    customer?: { currency_code?: string };
    metrics?: { cost_micros?: string | number };
  }>) {
    const monthRaw = row.segments?.month;
    if (!monthRaw) continue;
    const startDate = monthToStartDate(monthRaw);
    const ym = toYm(startDate);
    const currency = (row.customer?.currency_code || "GBP").toUpperCase();
    const micros = Number(row.metrics?.cost_micros || 0);
    const prev = byMonth.get(ym);
    if (prev) prev.micros += micros;
    else byMonth.set(ym, { micros, currency });
  }

  const rows: GoogleAdsMonthSpend[] = [...byMonth.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([ym, v]) => ({
      invoiceMonth: ym,
      startDate: monthToStartDate(ym),
      amountMajor: microsToMajor(v.micros),
      currency: v.currency,
    }))
    .filter((r) => r.amountMajor > 0);

  const currency = rows[0]?.currency || "GBP";
  return { rows, currency };
}

export function assertGoogleAdsEnv() {
  requireEnv("GOOGLE_ADS_DEVELOPER_TOKEN");
  requireEnv("GOOGLE_ADS_CUSTOMER_ID");
}
