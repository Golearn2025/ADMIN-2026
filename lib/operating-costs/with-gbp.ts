import { toGbpPence } from "@/lib/operating-costs/fx";

/** Attach GBP conversion fields for inserts/updates. */
export async function withGbpFields(input: {
  amount_pence: number;
  currency: string;
  start_date: string;
}): Promise<{
  amount_gbp_pence: number;
  fx_rate_to_gbp: number;
  fx_as_of: string;
}> {
  const { amountGbpPence, fxRateToGbp, fxAsOf } = await toGbpPence(
    input.amount_pence,
    input.currency,
    input.start_date
  );
  return {
    amount_gbp_pence: amountGbpPence,
    fx_rate_to_gbp: fxRateToGbp,
    fx_as_of: fxAsOf,
  };
}
