import type { Database } from "@/lib/supabase/database.types";

export type DriverPayoutStatus =
  | "unpaid"
  | "ready"
  | "exported"
  | "paid"
  | "skipped"
  | "partial";

/** Persistence layer — generated Supabase view rows (nullable). */
export type DriverPayoutJobRow =
  Database["public"]["Views"]["admin_driver_payout_jobs_v1"]["Row"];
export type DriverPayoutWeeklyRow =
  Database["public"]["Views"]["admin_driver_payout_weekly_v1"]["Row"];

/**
 * Domain / UI DTO — non-null where the product needs values.
 * Mapped from view rows at the API boundary (not cast with unknown).
 */
export type DriverPayoutJob = {
  organization_id: string;
  booking_id: string;
  booking_leg_id: string;
  leg_number: number;
  booking_reference: string;
  booking_status: string;
  leg_status: string;
  driver_id: string;
  driver_name: string;
  driver_phone: string | null;
  driver_email: string | null;
  settlement_at: string | null;
  settlement_date_london: string | null;
  week_key: string;
  week_start_london: string;
  week_end_london: string;
  client_paid_pence: number;
  client_paid: boolean;
  client_last_paid_at: string | null;
  driver_owed_pence: number;
  currency: string;
  has_uk_bank_details: boolean;
  bank_verified: boolean;
  account_holder_name: string | null;
  bank_name: string | null;
  account_number_last4: string | null;
  sort_code_masked: string | null;
  payout_status: DriverPayoutStatus;
  payout_paid_at: string | null;
  payout_payment_reference: string | null;
  payout_export_batch_id: string | null;
  payout_notes: string | null;
  payout_mark_id: string | null;
};

export type DriverPayoutWeekly = {
  organization_id: string;
  driver_id: string;
  driver_name: string;
  driver_email: string | null;
  driver_phone: string | null;
  week_key: string;
  week_start_london: string;
  week_end_london: string;
  currency: string;
  jobs_count: number;
  jobs_client_paid_count: number;
  client_paid_pence: number;
  driver_owed_pence: number;
  jobs_paid_count: number;
  jobs_exported_count: number;
  jobs_unpaid_count: number;
  has_uk_bank_details: boolean;
  all_jobs_have_bank: boolean;
  account_holder_name: string | null;
  bank_name: string | null;
  account_number_last4: string | null;
  sort_code_masked: string | null;
  week_payout_status: DriverPayoutStatus;
};

const PAYOUT_STATUSES = new Set<DriverPayoutStatus>([
  "unpaid",
  "ready",
  "exported",
  "paid",
  "skipped",
  "partial",
]);

function asStatus(value: string | null | undefined): DriverPayoutStatus {
  if (value && PAYOUT_STATUSES.has(value as DriverPayoutStatus)) {
    return value as DriverPayoutStatus;
  }
  return "unpaid";
}

/** Map SSOT job view → UI DTO. Drops full bank numbers. */
export function toDriverPayoutJobDto(row: DriverPayoutJobRow): DriverPayoutJob | null {
  if (!row.organization_id || !row.booking_id || !row.booking_leg_id || !row.driver_id) {
    return null;
  }
  return {
    organization_id: row.organization_id,
    booking_id: row.booking_id,
    booking_leg_id: row.booking_leg_id,
    leg_number: row.leg_number ?? 1,
    booking_reference: row.booking_reference || "",
    booking_status: row.booking_status || "",
    leg_status: row.leg_status || "",
    driver_id: row.driver_id,
    driver_name: row.driver_name || "Driver",
    driver_phone: row.driver_phone,
    driver_email: row.driver_email,
    settlement_at: row.settlement_at,
    settlement_date_london: row.settlement_date_london,
    week_key: row.week_key || "",
    week_start_london: row.week_start_london || "",
    week_end_london: row.week_end_london || "",
    client_paid_pence: row.client_paid_pence ?? 0,
    client_paid: Boolean(row.client_paid),
    client_last_paid_at: row.client_last_paid_at,
    driver_owed_pence: row.driver_owed_pence ?? 0,
    currency: row.currency || "GBP",
    has_uk_bank_details: Boolean(row.has_uk_bank_details),
    bank_verified: Boolean(row.bank_verified),
    account_holder_name: row.account_holder_name,
    bank_name: row.bank_name,
    account_number_last4: row.account_number_last4,
    sort_code_masked: row.sort_code_masked,
    payout_status: asStatus(row.payout_status),
    payout_paid_at: row.payout_paid_at,
    payout_payment_reference: row.payout_payment_reference,
    payout_export_batch_id: row.payout_export_batch_id,
    payout_notes: row.payout_notes,
    payout_mark_id: row.payout_mark_id,
  };
}

export function toDriverPayoutWeeklyDto(
  row: DriverPayoutWeeklyRow
): DriverPayoutWeekly | null {
  if (!row.organization_id || !row.driver_id || !row.week_key) return null;
  return {
    organization_id: row.organization_id,
    driver_id: row.driver_id,
    driver_name: row.driver_name || "Driver",
    driver_email: row.driver_email,
    driver_phone: row.driver_phone,
    week_key: row.week_key,
    week_start_london: row.week_start_london || "",
    week_end_london: row.week_end_london || "",
    currency: row.currency || "GBP",
    jobs_count: row.jobs_count ?? 0,
    jobs_client_paid_count: row.jobs_client_paid_count ?? 0,
    client_paid_pence: row.client_paid_pence ?? 0,
    driver_owed_pence: row.driver_owed_pence ?? 0,
    jobs_paid_count: row.jobs_paid_count ?? 0,
    jobs_exported_count: row.jobs_exported_count ?? 0,
    jobs_unpaid_count: row.jobs_unpaid_count ?? 0,
    has_uk_bank_details: Boolean(row.has_uk_bank_details),
    all_jobs_have_bank: Boolean(row.all_jobs_have_bank),
    account_holder_name: row.account_holder_name,
    bank_name: row.bank_name,
    account_number_last4: row.account_number_last4,
    sort_code_masked: row.sort_code_masked,
    week_payout_status: asStatus(row.week_payout_status),
  };
}

/**
 * Narrowed job ready for Wise export/pay — only after runtime field checks.
 */
export type WisePayableJob = {
  booking_leg_id: string;
  booking_id: string;
  driver_id: string;
  organization_id: string;
  driver_name: string;
  driver_email: string | null;
  driver_owed_pence: number;
  booking_reference: string;
  week_key: string;
  has_uk_bank_details: true;
  account_holder_name: string | null;
  wise_account_number: string;
  wise_sort_code: string;
  payout_status: string;
};

export function toWisePayableJob(row: DriverPayoutJobRow): WisePayableJob | null {
  if (
    !row.booking_leg_id ||
    !row.booking_id ||
    !row.driver_id ||
    !row.organization_id ||
    !row.driver_name ||
    !row.booking_reference ||
    !row.week_key ||
    row.driver_owed_pence == null ||
    row.driver_owed_pence <= 0 ||
    !row.has_uk_bank_details ||
    !row.wise_account_number ||
    !row.wise_sort_code
  ) {
    return null;
  }

  return {
    booking_leg_id: row.booking_leg_id,
    booking_id: row.booking_id,
    driver_id: row.driver_id,
    organization_id: row.organization_id,
    driver_name: row.driver_name,
    driver_email: row.driver_email,
    driver_owed_pence: row.driver_owed_pence,
    booking_reference: row.booking_reference,
    week_key: row.week_key,
    has_uk_bank_details: true,
    account_holder_name: row.account_holder_name,
    wise_account_number: row.wise_account_number,
    wise_sort_code: row.wise_sort_code,
    payout_status: row.payout_status || "unpaid",
  };
}

/** @deprecated Prefer select("*") on typed client + toDriverPayoutJobDto */
export const DRIVER_PAYOUT_JOB_SAFE_COLUMNS = [
  "organization_id",
  "booking_id",
  "booking_leg_id",
  "leg_number",
  "booking_reference",
  "booking_status",
  "leg_status",
  "driver_id",
  "driver_name",
  "driver_phone",
  "driver_email",
  "settlement_at",
  "settlement_date_london",
  "week_key",
  "week_start_london",
  "week_end_london",
  "client_paid_pence",
  "client_paid",
  "client_last_paid_at",
  "driver_owed_pence",
  "currency",
  "has_uk_bank_details",
  "bank_verified",
  "account_holder_name",
  "bank_name",
  "account_number_last4",
  "sort_code_masked",
  "payout_status",
  "payout_paid_at",
  "payout_payment_reference",
  "payout_export_batch_id",
  "payout_notes",
  "payout_mark_id",
].join(",");

export const DRIVER_PAYOUT_WEEKLY_COLUMNS = "*";

export const WISE_BATCH_DOCS = {
  helpCentre:
    "https://wise.com/help/articles/2663240/guide-to-batch-payments",
  apiBatchTransfers:
    "https://docs.wise.com/guides/product/send-money/transfers/batch-transfers",
  recipients:
    "https://docs.wise.com/guides/product/send-money/recipients/list-create-recipient",
  businessPayouts: "https://wise.com/gb/business/payouts",
} as const;
