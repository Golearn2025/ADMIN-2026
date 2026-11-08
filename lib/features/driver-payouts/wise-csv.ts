/**
 * Wise Business batch CSV helpers (UK sort-code recipients).
 * Template fields align with Wise batch upload / API recipient type `sort_code`.
 * @see https://wise.com/help/articles/2663240/guide-to-batch-payments
 * @see https://docs.wise.com/guides/product/send-money/recipients/list-create-recipient
 */

export type WiseUkRow = {
  name: string;
  recipientEmail?: string | null;
  amountGbp: number;
  sourceCurrency?: string;
  targetCurrency?: string;
  sortCode: string;
  accountNumber: string;
  reference: string;
};

function csvEscape(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function buildWiseUkBatchCsv(rows: WiseUkRow[]): string {
  const header = [
    "name",
    "recipientEmail",
    "paymentReference",
    "receiverType",
    "amountCurrency",
    "amount",
    "sourceCurrency",
    "targetCurrency",
    "sortCode",
    "accountNumber",
  ];

  const lines = rows.map((row) =>
    [
      csvEscape(row.name),
      csvEscape(row.recipientEmail || ""),
      csvEscape(row.reference.slice(0, 10)),
      "PRIVATE",
      "source",
      row.amountGbp.toFixed(2),
      row.sourceCurrency || "GBP",
      row.targetCurrency || "GBP",
      csvEscape(row.sortCode.replace(/\D/g, "").padStart(6, "0").slice(0, 6)),
      csvEscape(row.accountNumber.replace(/\s+/g, "")),
    ].join(",")
  );

  return [header.join(","), ...lines].join("\n");
}

export function wiseExportFilename(weekKey: string, batchId: string): string {
  const safeWeek = weekKey.replace(/[^\w-]/g, "_");
  return `wise-driver-payouts-${safeWeek}-${batchId}.csv`;
}
