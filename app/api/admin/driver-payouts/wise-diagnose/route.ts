/**
 * GET /api/admin/driver-payouts/wise-diagnose
 * Probes Wise balances + BALANCE vs BANK_TRANSFER GBP quotes (with UK recipient).
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentOrg } from "@/lib/auth/org";
import { diagnoseWiseGbpPricing } from "@/lib/features/driver-payouts/wise-api";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (!user || authError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const orgId = await getCurrentOrg(supabase, user.id);
    const admin = createAdminClient();
    let bank:
      | {
          accountHolderName: string;
          sortCode: string;
          accountNumber: string;
        }
      | undefined;

    if (admin && orgId) {
      const { data } = await admin
        .from("admin_driver_payout_jobs_v1")
        .select(
          "account_holder_name, wise_sort_code, wise_account_number"
        )
        .eq("organization_id", orgId)
        .eq("has_uk_bank_details", true)
        .not("wise_sort_code", "is", null)
        .not("wise_account_number", "is", null)
        .limit(1)
        .maybeSingle();
      if (
        data?.account_holder_name &&
        data?.wise_sort_code &&
        data?.wise_account_number
      ) {
        bank = {
          accountHolderName: data.account_holder_name,
          sortCode: data.wise_sort_code,
          accountNumber: data.wise_account_number,
        };
      }
    }

    const report = await diagnoseWiseGbpPricing({
      targetAmountGbp: 4,
      accountHolderName: bank?.accountHolderName,
      sortCode: bank?.sortCode,
      accountNumber: bank?.accountNumber,
    });
    return NextResponse.json(report);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
