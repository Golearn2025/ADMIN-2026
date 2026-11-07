export type ParsedBulkExpense = {
  startDate: string;
  amountMajor: number;
  currency: string;
  invoiceRef: string | null;
  description: string | null;
  raw: string;
  error?: string;
};

/**
 * Parse pasted invoice lines. Supported examples:
 *   2025-01-15 42.50
 *   2025-01-15 $42.50 INV-1234
 *   15/01/2025 42.50 USD
 *   2025-01-15,42.50,INV-1234,Pro plan January
 *   2025-01-15\t42.50\tINV-1234
 */
export function parseBulkExpenseLines(text: string): ParsedBulkExpense[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith("#"));

  return lines.map((raw) => parseOneLine(raw));
}

function parseOneLine(raw: string): ParsedBulkExpense {
  // CSV / TSV
  if (raw.includes("\t") || (raw.includes(",") && !raw.match(/^\d{4}-\d{2}-\d{2}\s/))) {
    const parts = raw.includes("\t")
      ? raw.split("\t").map((p) => p.trim())
      : raw.split(",").map((p) => p.trim());
    const date = normalizeDate(parts[0] || "");
    const amount = parseAmount(parts[1] || "");
    const currency = detectCurrency(parts[2] || "") || detectCurrency(parts[1] || "") || "USD";
    const invoiceRef =
      parts.find((p, i) => i >= 2 && /inv|invoice|#/i.test(p)) ||
      (parts[2] && !detectCurrency(parts[2]) && !/^\d+(\.\d+)?$/.test(parts[2])
        ? parts[2]
        : null);
    const description =
      parts.slice(invoiceRef ? parts.indexOf(invoiceRef) + 1 : 3).join(" ").trim() || null;

    if (!date || amount == null) {
      return {
        startDate: "",
        amountMajor: 0,
        currency,
        invoiceRef: null,
        description: null,
        raw,
        error: "Need date + amount (e.g. 2025-01-15 42.50)",
      };
    }
    return {
      startDate: date,
      amountMajor: amount,
      currency,
      invoiceRef: invoiceRef || null,
      description,
      raw,
    };
  }

  // Space-separated: DATE AMOUNT [CURRENCY] [REF...] [desc...]
  const tokens = raw.split(/\s+/);
  const date = normalizeDate(tokens[0] || "");
  const amount = parseAmount(tokens[1] || "");
  let idx = 2;
  let currency = detectCurrency(tokens[1] || "") || "USD";
  if (tokens[idx] && detectCurrency(tokens[idx])) {
    currency = detectCurrency(tokens[idx])!;
    idx += 1;
  }
  const rest = tokens.slice(idx);
  let invoiceRef: string | null = null;
  let description: string | null = null;
  if (rest.length) {
    if (/^(INV|in_|#)/i.test(rest[0]) || /^[A-Z0-9-]{6,}$/i.test(rest[0])) {
      invoiceRef = rest[0];
      description = rest.slice(1).join(" ") || null;
    } else {
      description = rest.join(" ") || null;
    }
  }

  if (!date || amount == null) {
    return {
      startDate: "",
      amountMajor: 0,
      currency,
      invoiceRef: null,
      description: null,
      raw,
      error: "Need date + amount (e.g. 2025-01-15 42.50)",
    };
  }

  return {
    startDate: date,
    amountMajor: amount,
    currency,
    invoiceRef,
    description,
    raw,
  };
}

function normalizeDate(input: string): string | null {
  const s = input.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const uk = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (uk) {
    const d = uk[1].padStart(2, "0");
    const m = uk[2].padStart(2, "0");
    return `${uk[3]}-${m}-${d}`;
  }
  const us = s.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (us) {
    const m = us[1].padStart(2, "0");
    const d = us[2].padStart(2, "0");
    return `${us[3]}-${m}-${d}`;
  }
  return null;
}

function parseAmount(input: string): number | null {
  const cleaned = input.replace(/[£$€,\s]/g, "").trim();
  if (!cleaned) return null;
  const n = Number(cleaned);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

function detectCurrency(input: string): string | null {
  const s = input.trim().toUpperCase();
  if (s === "USD" || s === "GBP" || s === "EUR") return s;
  if (input.includes("$")) return "USD";
  if (input.includes("£")) return "GBP";
  if (input.includes("€")) return "EUR";
  return null;
}
