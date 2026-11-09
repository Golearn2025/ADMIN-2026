/**
 * POST /api/admin/driver-payouts/pay-wise
 * Creates a Wise batch group (one transfer per driver) from SSOT jobs,
 * marks lines exported, attempts BALANCE fund (sandbox may succeed; UK live often needs portal).
 */
import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentOrg } from "@/lib/auth/org";
import { penceToGbp } from "@/lib/features/driver-payouts";
import {
  completeBatchGroup,
  createBatchGroup,
  createBatchGroupTransfer,
  createGbpQuote,
  createUkRecipient,
  fundBatchGroupBalance,
  getBatchGroup,
  getGbpBalanceAccountId,
  getWiseConfig,
  quoteUuid,
  resolveBusinessProfileId,
  selectBestGbpBalancePaymentOption,
  summarizeQuotePaymentOptions,
  updateQuoteTargetAccount,
} from "@/lib/features/driver-payouts/wise-api";

type PayJobRow = {
  booking_leg_id: string;
  booking_id: string;
  driver_id: string;
  organization_id: string;
  driver_name: string;
  driver_email: string | null;
  driver_owed_pence: number;
  booking_reference: string;
  week_key: string;
  has_uk_bank_details: boolean;
  account_holder_name: string | null;
  wise_account_number: string | null;
  wise_sort_code: string | null;
  payout_status: string;
};

export async function POST(req: NextRequest) {
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
    if (!orgId) {
      return NextResponse.json({ error: "No organization selected" }, { status: 400 });
    }

    const body = await req.json();
    const weekKey = typeof body.weekKey === "string" ? body.weekKey : null;
    const driverId = typeof body.driverId === "string" ? body.driverId : null;
    const bookingLegIds: string[] | null = Array.isArray(body.bookingLegIds)
      ? body.bookingLegIds
      : null;
    const attemptFund = body.attemptFund !== false;

    if (!weekKey && !bookingLegIds?.length) {
      return NextResponse.json(
        { error: "weekKey or bookingLegIds required" },
        { status: 400 }
      );
    }

    const admin = createAdminClient();
    if (!admin) {
      return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });
    }

    let query = admin
      .from("admin_driver_payout_jobs_v1")
      .select(
        [
          "booking_leg_id",
          "booking_id",
          "driver_id",
          "organization_id",
          "driver_name",
          "driver_email",
          "driver_owed_pence",
          "booking_reference",
          "week_key",
          "has_uk_bank_details",
          "account_holder_name",
          "wise_account_number",
          "wise_sort_code",
          "payout_status",
        ].join(",")
      )
      .eq("organization_id", orgId)
      .gt("driver_owed_pence", 0)
      .in("payout_status", ["unpaid", "ready", "exported"]);

    if (weekKey) query = query.eq("week_key", weekKey);
    if (driverId) query = query.eq("driver_id", driverId);
    if (bookingLegIds?.length) query = query.in("booking_leg_id", bookingLegIds);

    const { data, error } = await query;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const jobs = (data || []) as unknown as PayJobRow[];
    const eligible = jobs.filter(
      (j) =>
        j.has_uk_bank_details &&
        j.wise_account_number &&
        j.wise_sort_code &&
        j.driver_owed_pence > 0
    );

    if (!eligible.length) {
      return NextResponse.json(
        {
          error:
            "No exportable jobs. Need UK bank details + unpaid owed amount > 0. If everything is Mark paid, reset to unpaid first.",
          skipped: jobs.length,
        },
        { status: 400 }
      );
    }

    const byDriver = new Map<
      string,
      {
        name: string;
        sortCode: string;
        accountNumber: string;
        amountPence: number;
        refs: string[];
        legIds: string[];
        bookingIds: string[];
        weekKey: string;
      }
    >();

    for (const job of eligible) {
      const existing = byDriver.get(job.driver_id);
      if (existing) {
        existing.amountPence += job.driver_owed_pence;
        existing.refs.push(job.booking_reference);
        existing.legIds.push(job.booking_leg_id);
        existing.bookingIds.push(job.booking_id);
      } else {
        byDriver.set(job.driver_id, {
          name: job.account_holder_name || job.driver_name,
          sortCode: job.wise_sort_code!,
          accountNumber: job.wise_account_number!,
          amountPence: job.driver_owed_pence,
          refs: [job.booking_reference],
          legIds: [job.booking_leg_id],
          bookingIds: [job.booking_id],
          weekKey: job.week_key,
        });
      }
    }

    const cfg = getWiseConfig();
    const profileId = await resolveBusinessProfileId();
    const labelWeek = weekKey || eligible[0].week_key;
    const batch = await createBatchGroup({
      profileId,
      name: `Driver payouts ${labelWeek} ${new Date().toISOString().slice(0, 16)}`,
    });

    const gbpBalanceId = await getGbpBalanceAccountId(profileId);
    if (gbpBalanceId == null) {
      return NextResponse.json(
        {
          error:
            "No GBP balance id. Set WISE_GBP_BALANCE_ID in .env.local, or ensure GET /v4/profiles/{id}/balances works for this token. Without it, Wise quotes BANK_TRANSFER fees (~£0.52).",
          profileId,
          diagnoseUrl: "/api/admin/driver-payouts/wise-diagnose",
        },
        { status: 400 }
      );
    }

    const transferResults: Array<{
      driverId: string;
      amountGbp: number;
      wiseFeeGbp: number | null;
      payIn?: string;
      quotePreferredPayIn?: string | null;
      ok: boolean;
      error?: string;
      paymentOptions?: ReturnType<typeof summarizeQuotePaymentOptions>;
    }> = [];

    for (const [dId, row] of byDriver.entries()) {
      try {
        // Recipient-first so rail + fees refresh for UK Faster Payments.
        const recipient = await createUkRecipient({
          profileId,
          accountHolderName: row.name,
          sortCode: row.sortCode,
          accountNumber: row.accountNumber,
          ownedByCustomer: false,
        });
        let quote = await createGbpQuote({
          profileId,
          targetAmountGbp: penceToGbp(row.amountPence),
          targetAccountId: recipient.id,
          gbpBalanceId,
        });
        try {
          quote = await updateQuoteTargetAccount({
            profileId,
            quoteId: quoteUuid(quote),
            targetAccountId: recipient.id,
            gbpBalanceId,
          });
        } catch {
          // already bound
        }
        const paymentOptions = summarizeQuotePaymentOptions(quote);
        const option = selectBestGbpBalancePaymentOption(quote);
        if (!option) {
          throw new Error(
            `No BALANCE→BANK_TRANSFER quote option. Options: ${JSON.stringify(paymentOptions)}`
          );
        }
        // Reject bank-priced quotes (~£0.52). BALANCE local GBP should be £0.
        if (option.feeTotal > 0) {
          throw new Error(
            `Wise BALANCE fee £${option.feeTotal.toFixed(2)} (want £0). Options: ${JSON.stringify(paymentOptions)}`
          );
        }
        await createBatchGroupTransfer({
          profileId,
          batchGroupId: batch.id,
          quoteUuid: quoteUuid(quote),
          targetAccountId: recipient.id,
          customerTransactionId: randomUUID(),
          reference: `${row.weekKey}`.replace(/[^A-Za-z0-9]/g, "").slice(0, 10),
        });
        transferResults.push({
          driverId: dId,
          amountGbp: penceToGbp(row.amountPence),
          wiseFeeGbp: option.feeTotal,
          payIn: option.payIn,
          quotePreferredPayIn:
            quote.preferredPayIn != null ? String(quote.preferredPayIn) : null,
          ok: true,
          paymentOptions,
        });
      } catch (err) {
        transferResults.push({
          driverId: dId,
          amountGbp: penceToGbp(row.amountPence),
          wiseFeeGbp: null,
          ok: false,
          error: err instanceof Error ? err.message : "Transfer create failed",
        });
      }
    }

    const okTransfers = transferResults.filter((t) => t.ok);
    if (!okTransfers.length) {
      return NextResponse.json(
        {
          error: "Wise batch created but no transfers succeeded",
          batchGroupId: batch.id,
          transferResults,
        },
        { status: 502 }
      );
    }

    // Wise requires optimistic-lock `version` on PATCH (increments as transfers are added)
    const latest = await getBatchGroup({
      profileId,
      batchGroupId: batch.id,
    });
    const version =
      typeof latest.version === "number"
        ? latest.version
        : typeof batch.version === "number"
          ? batch.version
          : 0;
    await completeBatchGroup({
      profileId,
      batchGroupId: batch.id,
      version,
    });

    const completed = await getBatchGroup({
      profileId,
      batchGroupId: batch.id,
    });
    const transferIds = Array.isArray(completed.transferIds)
      ? completed.transferIds
      : [];
    if (!transferIds.length) {
      return NextResponse.json(
        {
          error:
            "Wise batch was created/completed but has 0 transfers. Nothing will appear to pay in Wise. Check quote/recipient errors above.",
          batchGroupId: batch.id,
          profileId,
          transferResults,
          batch: completed,
        },
        { status: 502 }
      );
    }

    let funded = false;
    let fundError: string | null = null;
    if (attemptFund) {
      const fund = await fundBatchGroupBalance({
        profileId,
        batchGroupId: batch.id,
      });
      funded = fund.ok;
      fundError = fund.ok ? null : fund.error;
    }

    const now = new Date().toISOString();
    const successDriverIds = new Set(okTransfers.map((t) => t.driverId));
    const markJobs = eligible.filter((j) => successDriverIds.has(j.driver_id));
    const markRows = markJobs.map((job) => ({
      organization_id: job.organization_id,
      booking_id: job.booking_id,
      booking_leg_id: job.booking_leg_id,
      driver_id: job.driver_id,
      status: funded ? ("paid" as const) : ("exported" as const),
      paid_at: funded ? now : null,
      paid_by_auth_user_id: funded ? user.id : null,
      export_batch_id: batch.id,
      payment_reference: batch.id,
      notes: funded
        ? `Wise API funded batch ${batch.id}`
        : `Wise API batch ${batch.id} — fund in portal${fundError ? `: ${fundError}` : ""}`,
      updated_at: now,
    }));

    const { error: markError } = await admin
      .from("driver_payout_line_marks")
      .upsert(markRows, { onConflict: "booking_leg_id" });

    if (markError) {
      return NextResponse.json(
        {
          error: `Wise batch ok but mark failed: ${markError.message}`,
          batchGroupId: batch.id,
          funded,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      env: cfg.env,
      portalUrl: cfg.portalUrl,
      profileId,
      batchGroupId: batch.id,
      funded,
      fundError,
      drivers: okTransfers.length,
      failedDrivers: transferResults.filter((t) => !t.ok).length,
      jobs: markJobs.length,
      totalGbp: okTransfers.reduce((s, t) => s + t.amountGbp, 0),
      totalWiseFeeGbp: okTransfers.reduce(
        (s, t) => s + (typeof t.wiseFeeGbp === "number" ? t.wiseFeeGbp : 0),
        0
      ),
      gbpBalanceId,
      transferIds,
      transferResults,
      batchStatus: completed.status,
      debugUrl: `/api/admin/driver-payouts/wise-batch?id=${batch.id}`,
      nextStep: funded
        ? "Batch funded from Wise balance. Jobs marked paid."
        : `Per Wise docs (UK personal token): API drafts only — fund the batch in Wise portal. Quotes requested BALANCE pay-in (fee £0). Batch ${batch.id}`,
      docs: {
        personalTokenLimits:
          "https://docs.wise.com/guides/developer/auth-and-security/personal-api-token",
        balanceQuote:
          "https://docs.wise.com/guides/product/send-money/quotes/authenticated-quote",
        smbPayouts:
          "https://docs.wise.com/guides/product/send-money/use-cases/payouts-smbs",
      },
    });
  } catch (err) {
    console.error("[driver-payouts/pay-wise]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
