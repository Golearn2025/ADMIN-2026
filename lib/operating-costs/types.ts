export type CostCadence =
  | "one_time"
  | "daily"
  | "weekly"
  | "monthly"
  | "yearly"
  | "multi_year";

export type CostCategory =
  | "hosting"
  | "payments"
  | "maps"
  | "software"
  | "comms"
  | "compliance"
  | "office"
  | "marketing"
  | "payroll"
  | "other";

export type CatalogItem = {
  catalog_id: string;
  slug: string;
  name: string;
  category: string;
  suggested_cadence: string;
  is_usage_based: boolean;
  search_hint: string | null;
  website_url: string | null;
  sort_order: number;
  entries_count: number;
  has_active_entry: boolean;
};

export type PaymentStatus = "paid" | "unpaid";

export type OperatingCostRow = {
  id: string;
  organization_id: string;
  catalog_id: string | null;
  catalog_slug: string | null;
  vendor_name: string;
  category: string;
  description: string | null;
  amount_pence: number;
  currency: string;
  cadence: CostCadence;
  amortize_months: number | null;
  start_date: string;
  end_date: string | null;
  is_usage_based: boolean;
  invoice_ref: string | null;
  notes: string | null;
  status: "active" | "ended";
  payment_status: PaymentStatus;
  created_at: string;
  updated_at: string;
  monthly_equivalent_pence: number;
  daily_equivalent_pence: number;
  yearly_equivalent_pence: number;
};

export type OperatingCostSummary = {
  organization_id: string;
  active_count: number;
  one_time_count: number;
  cash_spent_pence: number;
  monthly_burn_pence: number;
  daily_burn_pence: number;
  yearly_burn_pence: number;
  unpaid_pence?: number;
  unpaid_count?: number;
};

export const CADENCE_OPTIONS: { value: CostCadence; label: string }[] = [
  { value: "one_time", label: "One-time" },
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
  { value: "multi_year", label: "Multi-year (amortize)" },
];

export const CATEGORY_OPTIONS: { value: CostCategory; label: string }[] = [
  { value: "hosting", label: "Hosting" },
  { value: "payments", label: "Payments" },
  { value: "maps", label: "Maps" },
  { value: "software", label: "Software" },
  { value: "comms", label: "Comms" },
  { value: "compliance", label: "Compliance" },
  { value: "office", label: "Office" },
  { value: "marketing", label: "Marketing" },
  { value: "payroll", label: "Payroll" },
  { value: "other", label: "Other" },
];

export function formatPounds(pence: number | null | undefined): string {
  return formatMoney(pence, "GBP");
}

export function formatMoney(
  minor: number | null | undefined,
  currency: string | null | undefined = "GBP"
): string {
  const n = Number(minor) || 0;
  const cur = (currency || "GBP").toUpperCase();
  try {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: cur,
    }).format(n / 100);
  } catch {
    return `${(n / 100).toFixed(2)} ${cur}`;
  }
}
