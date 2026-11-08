export type DriverPayoutStatus =
  | "unpaid"
  | "ready"
  | "exported"
  | "paid"
  | "skipped"
  | "partial";

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

/** Safe columns for browser list (no full account/sort). */
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
