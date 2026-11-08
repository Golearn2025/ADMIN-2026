/**
 * Wise Business personal-token client (sandbox / production).
 * @see https://docs.wise.com/guides/product/send-money/use-cases/payouts-smbs
 * @see https://docs.wise.com/guides/developer/auth-and-security/personal-api-token
 */

export type WiseEnv = "sandbox" | "production";

export type WiseProfile = {
  id: number;
  type: "personal" | "business" | string;
  details?: Record<string, unknown>;
};

export type WiseRecipient = {
  id: number;
  currency: string;
  accountHolderName?: string;
};

export type WiseQuote = {
  id?: number;
  uuid?: string;
  // modern quotes use uuid as id string
  [key: string]: unknown;
};

export type WiseBatchGroup = {
  id: string;
  status?: string;
  name?: string;
  sourceCurrency?: string;
  /** Optimistic-lock version — required on PATCH complete/cancel */
  version?: number;
  transferIds?: number[];
  payInDetails?: unknown[];
};

function baseUrl(env: WiseEnv): string {
  return env === "production"
    ? "https://api.wise.com"
    : "https://api.wise-sandbox.com";
}

export function getWiseConfig(): {
  token: string;
  env: WiseEnv;
  profileId: number | null;
  portalUrl: string;
} {
  const token = process.env.WISE_API_TOKEN?.trim();
  if (!token) {
    throw new Error("WISE_API_TOKEN is not set in .env.local");
  }
  const envRaw = (process.env.WISE_ENV || "sandbox").toLowerCase();
  const env: WiseEnv = envRaw === "production" ? "production" : "sandbox";
  const profileIdRaw = process.env.WISE_PROFILE_ID?.trim();
  const profileId = profileIdRaw ? Number(profileIdRaw) : null;
  return {
    token,
    env,
    profileId: Number.isFinite(profileId) ? profileId : null,
    portalUrl:
      env === "production" ? "https://wise.com" : "https://wise-sandbox.com",
  };
}

async function wiseFetch<T>(
  path: string,
  init: RequestInit & { env?: WiseEnv; token?: string } = {}
): Promise<T> {
  const cfg = getWiseConfig();
  const env = init.env || cfg.env;
  const token = init.token || cfg.token;
  const { env: _e, token: _t, ...rest } = init;
  const url = `${baseUrl(env)}${path}`;
  const res = await fetch(url, {
    ...rest,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(rest.headers || {}),
    },
    cache: "no-store",
  });
  const text = await res.text();
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  if (!res.ok) {
    const msg =
      typeof body === "object" && body && "error_description" in body
        ? String((body as { error_description?: string }).error_description)
        : typeof body === "object" && body && "message" in body
          ? String((body as { message?: string }).message)
          : typeof body === "string"
            ? body
            : JSON.stringify(body);
    throw new Error(`Wise ${res.status} ${path}: ${msg || res.statusText}`);
  }
  return body as T;
}

export async function listWiseProfiles(): Promise<WiseProfile[]> {
  return wiseFetch<WiseProfile[]>("/v1/profiles");
}

export async function resolveBusinessProfileId(): Promise<number> {
  const cfg = getWiseConfig();
  if (cfg.profileId) return cfg.profileId;
  const profiles = await listWiseProfiles();
  const business = profiles.find((p) => p.type === "business");
  const chosen = business || profiles[0];
  if (!chosen?.id) {
    throw new Error("No Wise profile found for this API token");
  }
  return chosen.id;
}

export async function createUkRecipient(input: {
  profileId: number;
  accountHolderName: string;
  sortCode: string;
  accountNumber: string;
  /** true when paying your own personal account from the business profile */
  ownedByCustomer?: boolean;
}): Promise<WiseRecipient> {
  const sortCode = input.sortCode.replace(/\D/g, "").slice(0, 6);
  const accountNumber = input.accountNumber.replace(/\s+/g, "");
  return wiseFetch<WiseRecipient>("/v1/accounts", {
    method: "POST",
    body: JSON.stringify({
      currency: "GBP",
      type: "sort_code",
      profile: input.profileId,
      ownedByCustomer: Boolean(input.ownedByCustomer),
      accountHolderName: input.accountHolderName,
      details: {
        legalType: "PRIVATE",
        sortCode,
        accountNumber,
      },
    }),
  });
}

function quoteFeeTotal(option: Record<string, unknown>): number {
  const price = option.price as
    | { total?: { value?: { amount?: number } } }
    | undefined;
  const priceAmount = price?.total?.value?.amount;
  if (typeof priceAmount === "number" && Number.isFinite(priceAmount)) {
    return priceAmount;
  }
  const fee = option.fee as { total?: number } | undefined;
  return Number(fee?.total ?? 0);
}

/**
 * Recipient-first quote for balance-funded GBP→GBP.
 * Docs: https://docs.wise.com/guides/product/send-money/quotes/authenticated-quote
 * Use preferredPayIn + payInMethod (+ balance ids) or Wise defaults to BANK_TRANSFER fees.
 */
export async function createGbpQuote(input: {
  profileId: number;
  targetAmountGbp: number;
  targetAccountId: number;
  /** Wise GBP balance id — binds quote to balance funding. */
  gbpBalanceId?: number | null;
}): Promise<WiseQuote> {
  const amount = Number(input.targetAmountGbp.toFixed(2));
  // Exact field set from Wise "PayIn selection" sample
  const body: Record<string, unknown> = {
    sourceCurrency: "GBP",
    targetCurrency: "GBP",
    sourceAmount: null,
    targetAmount: amount,
    targetAccount: input.targetAccountId,
    payOut: "BANK_TRANSFER",
    preferredPayIn: "BALANCE",
    payInMethod: "BALANCE",
  };
  if (input.gbpBalanceId != null) {
    body.payInId = input.gbpBalanceId;
    body.preferredPayInId = input.gbpBalanceId;
  }
  try {
    return await wiseFetch<WiseQuote>(
      `/v3/profiles/${input.profileId}/quotes`,
      { method: "POST", body: JSON.stringify(body) }
    );
  } catch (firstErr) {
    // Fallback: preferredPayIn only (older accept paths)
    try {
      const slim = {
        sourceCurrency: "GBP",
        targetCurrency: "GBP",
        sourceAmount: null,
        targetAmount: amount,
        targetAccount: input.targetAccountId,
        payOut: "BANK_TRANSFER",
        preferredPayIn: "BALANCE",
        ...(input.gbpBalanceId != null
          ? {
              preferredPayInId: input.gbpBalanceId,
              payInId: input.gbpBalanceId,
            }
          : {}),
      };
      return await wiseFetch<WiseQuote>(
        `/v3/profiles/${input.profileId}/quotes`,
        { method: "POST", body: JSON.stringify(slim) }
      );
    } catch {
      return wiseFetch<WiseQuote>("/v2/quotes", {
        method: "POST",
        body: JSON.stringify({
          profile: input.profileId,
          source: "GBP",
          target: "GBP",
          targetAmount: amount,
          targetAccount: input.targetAccountId,
          preferredPayIn: "BALANCE",
          payOut: "BANK_TRANSFER",
        }),
      }).catch(() => {
        throw firstErr;
      });
    }
  }
}

export async function updateQuoteTargetAccount(input: {
  profileId: number;
  quoteId: string;
  targetAccountId: number;
  gbpBalanceId?: number | null;
}): Promise<WiseQuote> {
  const body: Record<string, unknown> = {
    targetAccount: input.targetAccountId,
    payOut: "BANK_TRANSFER",
    preferredPayIn: "BALANCE",
    payInMethod: "BALANCE",
  };
  if (input.gbpBalanceId != null) {
    body.payInId = input.gbpBalanceId;
    body.preferredPayInId = input.gbpBalanceId;
  }
  return wiseFetch<WiseQuote>(
    `/v3/profiles/${input.profileId}/quotes/${input.quoteId}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/merge-patch+json" },
      body: JSON.stringify(body),
    }
  );
}

/** Summarize quote paymentOptions for debugging fee selection. */
export function summarizeQuotePaymentOptions(quote: WiseQuote): Array<{
  payIn: string;
  payOut: string;
  feeTotal: number;
  disabled: boolean;
  disabledReason?: string;
}> {
  const options = (quote as { paymentOptions?: unknown }).paymentOptions;
  if (!Array.isArray(options)) return [];
  return options.map((raw) => {
    const o = raw as Record<string, unknown>;
    const reason = o.disabledReason as { message?: string } | undefined;
    return {
      payIn: String(o.payIn || ""),
      payOut: String(o.payOut || ""),
      feeTotal: quoteFeeTotal(o),
      disabled: o.disabled === true,
      disabledReason: reason?.message,
    };
  });
}

/** Pick BALANCE → BANK_TRANSFER option with lowest fee (ideally 0 for UK GBP). */
export function selectBestGbpBalancePaymentOption(quote: WiseQuote): {
  feeTotal: number;
  payIn: string;
  payOut: string;
} | null {
  const options = (quote as { paymentOptions?: unknown }).paymentOptions;
  if (!Array.isArray(options) || !options.length) return null;
  const eligible = options
    .map((o) => o as Record<string, unknown>)
    .filter((o) => {
      if (o.disabled === true) return false;
      const payIn = String(o.payIn || "");
      const payOut = String(o.payOut || "");
      return payIn === "BALANCE" && payOut === "BANK_TRANSFER";
    });
  if (!eligible.length) return null;
  const scored = eligible.map((o) => ({
    feeTotal: quoteFeeTotal(o),
    payIn: String(o.payIn || ""),
    payOut: String(o.payOut || ""),
  }));
  scored.sort((a, b) => a.feeTotal - b.feeTotal);
  return scored[0] || null;
}

export async function getGbpBalanceAccountId(
  profileId: number
): Promise<number | null> {
  // Optional override when balances API is restricted for the token region
  const fromEnv = process.env.WISE_GBP_BALANCE_ID?.trim();
  if (fromEnv && Number.isFinite(Number(fromEnv))) return Number(fromEnv);

  // Try modern balances first, then legacy borderless accounts.
  try {
    const balances = await wiseFetch<Array<Record<string, unknown>>>(
      `/v4/profiles/${profileId}/balances?types=STANDARD`
    );
    const gbp = (balances || []).find(
      (b) => String(b.currency || "").toUpperCase() === "GBP"
    );
    if (gbp?.id != null) return Number(gbp.id);
  } catch {
    // fall through
  }
  try {
    const accounts = await wiseFetch<Array<Record<string, unknown>>>(
      `/v1/borderless-accounts?profileId=${profileId}`
    );
    for (const acc of accounts || []) {
      const balances = acc.balances as Array<Record<string, unknown>> | undefined;
      const gbp = (balances || []).find(
        (b) => String(b.currency || "").toUpperCase() === "GBP"
      );
      // Legacy: borderless account id (not per-currency balance id)
      if (acc.id != null && gbp) return Number(acc.id);
    }
  } catch {
    // ignore
  }
  return null;
}

function optionSourceAmount(quote: WiseQuote, payIn: string): number | null {
  const options = (quote as { paymentOptions?: unknown }).paymentOptions;
  if (!Array.isArray(options)) return null;
  const hit = options
    .map((o) => o as Record<string, unknown>)
    .find(
      (o) =>
        o.disabled !== true &&
        String(o.payIn || "") === payIn &&
        String(o.payOut || "") === "BANK_TRANSFER"
    );
  if (!hit) return null;
  const n = Number(hit.sourceAmount);
  return Number.isFinite(n) ? n : null;
}

/** Probe balances + BALANCE-priced GBP quote, with and without UK recipient. */
export async function diagnoseWiseGbpPricing(input?: {
  targetAmountGbp?: number;
  accountHolderName?: string;
  sortCode?: string;
  accountNumber?: string;
}): Promise<{
  profileId: number;
  gbpBalanceId: number | null;
  balancesError: string | null;
  balances: Array<{ id: number; currency: string; amount?: number }>;
  withoutRecipient: {
    quotePreferredPayIn: string | null;
    balanceOptionFeeGbp: number | null;
    bankOptionFeeGbp: number | null;
    balanceYouPayGbp: number | null;
    bankYouPayGbp: number | null;
  };
  withRecipient: {
    recipientId: number | null;
    quotePreferredPayIn: string | null;
    balanceOptionFeeGbp: number | null;
    bankOptionFeeGbp: number | null;
    balanceYouPayGbp: number | null;
    bankYouPayGbp: number | null;
    paymentOptions: ReturnType<typeof summarizeQuotePaymentOptions>;
  } | null;
  explanation: string;
  docsNote: string;
}> {
  const profileId = await resolveBusinessProfileId();
  let balancesError: string | null = null;
  let balances: Array<{ id: number; currency: string; amount?: number }> = [];
  try {
    const raw = await wiseFetch<Array<Record<string, unknown>>>(
      `/v4/profiles/${profileId}/balances?types=STANDARD`
    );
    balances = (raw || []).map((b) => ({
      id: Number(b.id),
      currency: String(b.currency || ""),
      amount: Number(
        (b.amount as { value?: number } | undefined)?.value ?? NaN
      ),
    }));
  } catch (err) {
    balancesError = err instanceof Error ? err.message : "balances failed";
  }
  const gbpBalanceId = await getGbpBalanceAccountId(profileId);
  const amount = Number((input?.targetAmountGbp ?? 4).toFixed(2));

  const buildQuoteBody = (targetAccount?: number) => {
    const quoteBody: Record<string, unknown> = {
      sourceCurrency: "GBP",
      targetCurrency: "GBP",
      sourceAmount: null,
      targetAmount: amount,
      payOut: "BANK_TRANSFER",
      preferredPayIn: "BALANCE",
      payInMethod: "BALANCE",
    };
    if (targetAccount != null) quoteBody.targetAccount = targetAccount;
    if (gbpBalanceId != null) {
      quoteBody.payInId = gbpBalanceId;
      quoteBody.preferredPayInId = gbpBalanceId;
    }
    return quoteBody;
  };

  const quoteNoRecipient = await wiseFetch<WiseQuote>(
    `/v3/profiles/${profileId}/quotes`,
    { method: "POST", body: JSON.stringify(buildQuoteBody()) }
  );
  const optsNo = summarizeQuotePaymentOptions(quoteNoRecipient);
  const balNo = optsNo.find(
    (o) => o.payIn === "BALANCE" && o.payOut === "BANK_TRANSFER" && !o.disabled
  );
  const bankNo = optsNo.find(
    (o) =>
      o.payIn === "BANK_TRANSFER" && o.payOut === "BANK_TRANSFER" && !o.disabled
  );

  let withRecipient: {
    recipientId: number | null;
    quotePreferredPayIn: string | null;
    balanceOptionFeeGbp: number | null;
    bankOptionFeeGbp: number | null;
    balanceYouPayGbp: number | null;
    bankYouPayGbp: number | null;
    paymentOptions: ReturnType<typeof summarizeQuotePaymentOptions>;
  } | null = null;

  const holder = input?.accountHolderName?.trim();
  const sort = input?.sortCode?.trim();
  const acct = input?.accountNumber?.trim();
  if (holder && sort && acct) {
    const recipient = await createUkRecipient({
      profileId,
      accountHolderName: holder,
      sortCode: sort,
      accountNumber: acct,
      ownedByCustomer: false,
    });
    const quote = await createGbpQuote({
      profileId,
      targetAmountGbp: amount,
      targetAccountId: recipient.id,
      gbpBalanceId,
    });
    const opts = summarizeQuotePaymentOptions(quote);
    const bal = opts.find(
      (o) => o.payIn === "BALANCE" && o.payOut === "BANK_TRANSFER" && !o.disabled
    );
    const bank = opts.find(
      (o) =>
        o.payIn === "BANK_TRANSFER" &&
        o.payOut === "BANK_TRANSFER" &&
        !o.disabled
    );
    withRecipient = {
      recipientId: recipient.id,
      quotePreferredPayIn:
        quote.preferredPayIn != null ? String(quote.preferredPayIn) : null,
      balanceOptionFeeGbp: bal ? bal.feeTotal : null,
      bankOptionFeeGbp: bank ? bank.feeTotal : null,
      balanceYouPayGbp: optionSourceAmount(quote, "BALANCE"),
      bankYouPayGbp: optionSourceAmount(quote, "BANK_TRANSFER"),
      paymentOptions: opts,
    };
  }

  return {
    profileId,
    gbpBalanceId,
    balancesError,
    balances,
    withoutRecipient: {
      quotePreferredPayIn:
        quoteNoRecipient.preferredPayIn != null
          ? String(quoteNoRecipient.preferredPayIn)
          : null,
      balanceOptionFeeGbp: balNo ? balNo.feeTotal : null,
      bankOptionFeeGbp: bankNo ? bankNo.feeTotal : null,
      balanceYouPayGbp: optionSourceAmount(quoteNoRecipient, "BALANCE"),
      bankYouPayGbp: optionSourceAmount(quoteNoRecipient, "BANK_TRANSFER"),
    },
    withRecipient,
    explanation:
      "If Review shows £4.52 you are on BANK_TRANSFER pay-in (fee £0.52). BALANCE pay-in is £4.00 (fee £0). UK personal API token cannot fund via API (403) — in Wise portal you must fund from Current account/balance, not bank transfer.",
    docsNote:
      "UK personal tokens: create quotes/transfers/batches OK; funding via API forbidden. See docs.wise.com personal-api-token + authenticated-quote preferredPayIn=BALANCE.",
  };
}

export function quoteUuid(quote: WiseQuote): string {
  const id = quote.uuid || quote.id;
  if (id == null) throw new Error("Wise quote missing id/uuid");
  return String(id);
}

export async function createBatchGroup(input: {
  profileId: number;
  name: string;
}): Promise<WiseBatchGroup> {
  return wiseFetch<WiseBatchGroup>(
    `/v3/profiles/${input.profileId}/batch-groups`,
    {
      method: "POST",
      body: JSON.stringify({
        sourceCurrency: "GBP",
        name: input.name.slice(0, 100),
      }),
    }
  );
}

export async function createBatchGroupTransfer(input: {
  profileId: number;
  batchGroupId: string;
  quoteUuid: string;
  targetAccountId: number;
  customerTransactionId: string;
  reference: string;
}): Promise<unknown> {
  // Docs: sourceAccount = refund recipient account ID (not the GBP balance id).
  // Balance funding is selected on the quote via preferredPayIn/payInMethod/payInId.
  return wiseFetch(
    `/v3/profiles/${input.profileId}/batch-groups/${input.batchGroupId}/transfers`,
    {
      method: "POST",
      body: JSON.stringify({
        targetAccount: input.targetAccountId,
        quoteUuid: input.quoteUuid,
        customerTransactionId: input.customerTransactionId,
        details: {
          reference: input.reference.slice(0, 10),
          transferPurpose: "verification.transfers.purpose.pay.bills",
          sourceOfFunds: "verification.source.of.funds.other",
        },
      }),
    }
  );
}

export async function getBatchGroup(input: {
  profileId: number;
  batchGroupId: string;
}): Promise<WiseBatchGroup> {
  return wiseFetch<WiseBatchGroup>(
    `/v3/profiles/${input.profileId}/batch-groups/${input.batchGroupId}`
  );
}

export async function completeBatchGroup(input: {
  profileId: number;
  batchGroupId: string;
  version: number;
}): Promise<WiseBatchGroup> {
  return wiseFetch<WiseBatchGroup>(
    `/v3/profiles/${input.profileId}/batch-groups/${input.batchGroupId}`,
    {
      method: "PATCH",
      body: JSON.stringify({
        version: input.version,
        status: "COMPLETED",
      }),
    }
  );
}

/**
 * Fund from Wise balance.
 * Correct path: POST /v3/profiles/{profileId}/batch-payments/{batchGroupId}/payments
 * UK / EEA personal tokens usually cannot fund via API (must pay in Wise portal
 * from **balance**, not bank transfer — bank pay-in shows ~£0.52 fees).
 */
export async function fundBatchGroupBalance(input: {
  profileId: number;
  batchGroupId: string;
}): Promise<{ ok: true; data: unknown } | { ok: false; error: string }> {
  const attempts: Array<{ path: string; body: Record<string, unknown> }> = [
    {
      path: `/v3/profiles/${input.profileId}/batch-payments/${input.batchGroupId}/payments`,
      body: { type: "BALANCE" },
    },
    {
      path: `/v3/profiles/${input.profileId}/batch-groups/${input.batchGroupId}/payment-initiations`,
      body: { type: "BALANCE" },
    },
  ];
  const errors: string[] = [];
  for (const attempt of attempts) {
    try {
      const data = await wiseFetch(attempt.path, {
        method: "POST",
        body: JSON.stringify(attempt.body),
      });
      return { ok: true, data };
    } catch (err) {
      errors.push(err instanceof Error ? err.message : "Fund failed");
    }
  }
  return {
    ok: false,
    error:
      errors.join(" | ") ||
      "Fund failed — UK personal tokens must pay from Wise balance in the portal",
  };
}

/** Best-effort fee read from a transfer resource (portal may still show bank fee until funded). */
export function transferReportedFeeGbp(transfer: unknown): number | null {
  if (!transfer || typeof transfer !== "object") return null;
  const t = transfer as Record<string, unknown>;
  const details = t.details as Record<string, unknown> | undefined;
  const direct = [t.fee, t.totalFee, details?.fee];
  for (const c of direct) {
    if (typeof c === "number" && Number.isFinite(c)) return c;
    if (c && typeof c === "object" && "total" in (c as object)) {
      const n = Number((c as { total?: unknown }).total);
      if (Number.isFinite(n)) return n;
    }
  }
  return null;
}

export async function getTransfer(transferId: number): Promise<unknown> {
  return wiseFetch(`/v1/transfers/${transferId}`);
}

export async function getWiseConnectionStatus(): Promise<{
  ok: boolean;
  env: WiseEnv;
  portalUrl: string;
  profileId: number | null;
  profileType: string | null;
  profileName: string | null;
  error?: string;
}> {
  try {
    const cfg = getWiseConfig();
    const profiles = await listWiseProfiles();
    const profileId = await resolveBusinessProfileId();
    const profile = profiles.find((p) => p.id === profileId) || profiles[0];
    const details = (profile?.details || {}) as Record<string, unknown>;
    const name =
      (details.name as string) ||
      [details.firstName, details.lastName].filter(Boolean).join(" ") ||
      null;
    return {
      ok: true,
      env: cfg.env,
      portalUrl: cfg.portalUrl,
      profileId,
      profileType: profile?.type || null,
      profileName: name,
    };
  } catch (err) {
    const cfg = (() => {
      try {
        return getWiseConfig();
      } catch {
        return null;
      }
    })();
    return {
      ok: false,
      env: cfg?.env || "sandbox",
      portalUrl: cfg?.portalUrl || "https://wise-sandbox.com",
      profileId: null,
      profileType: null,
      profileName: null,
      error: err instanceof Error ? err.message : "Wise connection failed",
    };
  }
}
