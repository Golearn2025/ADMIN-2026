export type FinancialSettingsSource = "organization_financial_settings" | "defaults";

/** Fields exposed on Financial Operations page (FO-1 MVP). */
export type FinancialOperationsForm = {
  processor_fee_percent: number;
  processor_fixed_fee_pounds: number;
  default_operational_reserve_pounds: number;
  hourly_operational_reserve_pounds: number;
  daily_operational_reserve_pounds: number;
  fleet_operational_reserve_pounds: number;
  low_margin_warning_percent: number;
  minimum_profit_pounds: number;
};

export type ReserveFieldKey =
  | "default_operational_reserve_pounds"
  | "hourly_operational_reserve_pounds"
  | "daily_operational_reserve_pounds"
  | "fleet_operational_reserve_pounds";

export type OperationalReserveField = {
  key: ReserveFieldKey;
  label: string;
  hint: string;
};
