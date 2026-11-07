/**
 * Google Cloud Billing → BigQuery export helpers for Operating Costs sync.
 */
import path from "path";
import { GoogleAuth } from "google-auth-library";

export type GoogleBillingMonthRow = {
  invoiceMonth: string; // YYYYMM
  serviceName: string;
  currency: string;
  netCost: number;
};

function credPath(): string {
  const raw = process.env.GOOGLE_APPLICATION_CREDENTIALS || "./secrets/gcp-billing-sa.json";
  return path.isAbsolute(raw) ? raw : path.join(process.cwd(), raw);
}

export function getGoogleBillingConfig() {
  const billingAccountId = process.env.GOOGLE_BILLING_ACCOUNT_ID || "";
  const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID || "vantage-lane";
  const datasetId = process.env.GOOGLE_BILLING_BQ_DATASET || "billing_export";
  const tableId =
    process.env.GOOGLE_BILLING_BQ_TABLE ||
    (billingAccountId
      ? `gcp_billing_export_v1_${billingAccountId.replace(/-/g, "_")}`
      : "");
  return { billingAccountId, projectId, datasetId, tableId, keyFile: credPath() };
}

async function getAuthClient() {
  const { keyFile } = getGoogleBillingConfig();
  const auth = new GoogleAuth({
    keyFile,
    scopes: [
      "https://www.googleapis.com/auth/bigquery",
      "https://www.googleapis.com/auth/cloud-billing.readonly",
      "https://www.googleapis.com/auth/cloud-platform",
    ],
  });
  return auth.getClient();
}

export async function listBillingExportTables(): Promise<string[]> {
  const { projectId, datasetId } = getGoogleBillingConfig();
  const client = await getAuthClient();
  const url = `https://bigquery.googleapis.com/bigquery/v2/projects/${projectId}/datasets/${datasetId}/tables`;
  const res = await client.request<{ tables?: { tableReference: { tableId: string } }[] }>({
    url,
  });
  return (res.data.tables || []).map((t) => t.tableReference.tableId);
}

type BqQueryResponse = {
  jobComplete?: boolean;
  rows?: { f: { v: string | null }[] }[];
  schema?: { fields?: { name: string }[] };
  errorResult?: { message?: string };
  errors?: { message?: string }[];
};

async function runQuery(sql: string): Promise<BqQueryResponse> {
  const { projectId } = getGoogleBillingConfig();
  const client = await getAuthClient();
  const res = await client.request<BqQueryResponse>({
    url: `https://bigquery.googleapis.com/bigquery/v2/projects/${projectId}/queries`,
    method: "POST",
    data: {
      query: sql,
      useLegacySql: false,
      timeoutMs: 60000,
    },
  });
  return res.data;
}

function rowsToObjects(data: BqQueryResponse): Record<string, string>[] {
  const fields = data.schema?.fields || [];
  return (data.rows || []).map((row) => {
    const obj: Record<string, string> = {};
    fields.forEach((f, i) => {
      obj[f.name] = row.f[i]?.v ?? "";
    });
    return obj;
  });
}

/**
 * Monthly net cost by service from standard billing export.
 * Returns [] if table missing / still empty (export lag).
 */
export async function fetchMonthlyServiceCosts(): Promise<{
  rows: GoogleBillingMonthRow[];
  tableId: string;
  emptyReason?: string;
}> {
  const { projectId, datasetId, tableId, billingAccountId } = getGoogleBillingConfig();
  if (!billingAccountId || !tableId) {
    return {
      rows: [],
      tableId: tableId || "",
      emptyReason: "GOOGLE_BILLING_ACCOUNT_ID missing",
    };
  }

  const tables = await listBillingExportTables();
  const resolved =
    tables.find((t) => t === tableId) ||
    tables.find((t) => t.startsWith("gcp_billing_export_v1_")) ||
    null;

  if (!resolved) {
    return {
      rows: [],
      tableId,
      emptyReason:
        tables.length === 0
          ? `Dataset ${datasetId} has no tables yet — Google fills the first export within ~24h after enable.`
          : `Expected table ${tableId} not found. Found: ${tables.join(", ") || "(none)"}`,
    };
  }

  const fq = `\`${projectId}.${datasetId}.${resolved}\``;
  const sql = `
    SELECT
      invoice.month AS invoice_month,
      service.description AS service_name,
      currency,
      ROUND(
        SUM(cost) + SUM(IFNULL((SELECT SUM(c.amount) FROM UNNEST(credits) c), 0)),
        4
      ) AS net_cost
    FROM ${fq}
    WHERE invoice.month IS NOT NULL
    GROUP BY 1, 2, 3
    HAVING ABS(SUM(cost) + SUM(IFNULL((SELECT SUM(c.amount) FROM UNNEST(credits) c), 0))) > 0.00005
    ORDER BY invoice_month DESC, net_cost DESC
  `;

  try {
    const data = await runQuery(sql);
    if (data.errorResult?.message) {
      return { rows: [], tableId: resolved, emptyReason: data.errorResult.message };
    }
    const objs = rowsToObjects(data);
    const rows: GoogleBillingMonthRow[] = objs.map((o) => ({
      invoiceMonth: String(o.invoice_month || ""),
      serviceName: String(o.service_name || "Unknown"),
      currency: String(o.currency || "GBP").toUpperCase(),
      netCost: Number(o.net_cost) || 0,
    }));
    return { rows, tableId: resolved };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    // Table exists but query fails on empty/new — surface message
    return { rows: [], tableId: resolved, emptyReason: msg };
  }
}

export function classifyGoogleService(serviceName: string): {
  catalogSlug: "google-maps" | "google-cloud";
  vendorName: string;
  category: string;
} {
  const s = serviceName.toLowerCase();
  if (
    s.includes("maps") ||
    s.includes("places") ||
    s.includes("geocod") ||
    s.includes("routes") ||
    s.includes("roads")
  ) {
    return {
      catalogSlug: "google-maps",
      vendorName: "Google Maps Platform",
      category: "maps",
    };
  }
  return {
    catalogSlug: "google-cloud",
    vendorName: "Google Cloud",
    category: "hosting",
  };
}

/** YYYYMM → first day ISO date */
export function invoiceMonthToDate(ym: string): string {
  if (!/^\d{6}$/.test(ym)) return new Date().toISOString().slice(0, 10);
  return `${ym.slice(0, 4)}-${ym.slice(4, 6)}-01`;
}

export function majorToMinor(amount: number): number {
  return Math.round(Math.abs(amount) * 100);
}
