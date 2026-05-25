import type { FinancialOperationsForm } from "./types";

export const FINANCIAL_OPERATIONS_DEFAULTS: FinancialOperationsForm = {
  processor_fee_percent: 1.4,
  processor_fixed_fee_pounds: 0.2,
  default_operational_reserve_pounds: 0,
  hourly_operational_reserve_pounds: 0,
  daily_operational_reserve_pounds: 0,
  fleet_operational_reserve_pounds: 0,
  low_margin_warning_percent: 10,
  minimum_profit_pounds: 0,
};

export const OPERATIONAL_RESERVE_FIELDS = [
  {
    key: "default_operational_reserve_pounds" as const,
    label: "Default (one-way / return)",
    hint: "Reserve per booking for standard trip types",
  },
  {
    key: "hourly_operational_reserve_pounds" as const,
    label: "Hourly",
    hint: "Reserve for hourly and fleet hourly",
  },
  {
    key: "daily_operational_reserve_pounds" as const,
    label: "Daily",
    hint: "Reserve for daily and fleet daily",
  },
  {
    key: "fleet_operational_reserve_pounds" as const,
    label: "Fleet",
    hint: "Reserve for multi-vehicle fleet bookings",
  },
] satisfies ReadonlyArray<{
  key: keyof Pick<
    FinancialOperationsForm,
    | "default_operational_reserve_pounds"
    | "hourly_operational_reserve_pounds"
    | "daily_operational_reserve_pounds"
    | "fleet_operational_reserve_pounds"
  >;
  label: string;
  hint: string;
}>;
