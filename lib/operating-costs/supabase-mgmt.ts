/**
 * Supabase Management API client (org / project billing).
 * Requires SUPABASE_ACCESS_TOKEN (sbp_…).
 */

export type MgmtAddonVariant = {
  id?: string;
  name?: string;
  price?: {
    description?: string;
    type?: string;
    interval?: string;
    amount?: number;
  };
};

export type MgmtSelectedAddon = {
  type?: string;
  variant?: MgmtAddonVariant;
};

export type MgmtAddonsResponse = {
  selected_addons?: MgmtSelectedAddon[];
  available_addons?: unknown[];
};

function requireToken(): string {
  const token = process.env.SUPABASE_ACCESS_TOKEN?.trim();
  if (!token) throw new Error("SUPABASE_ACCESS_TOKEN is not configured");
  return token;
}

export function getSupabaseOrgSlug(): string {
  return (
    process.env.SUPABASE_ORG_SLUG?.trim() ||
    "auujdizbhvsvptuupona" // Vantage Lane Project
  );
}

export function getSupabaseProjectRef(): string {
  return (
    process.env.SUPABASE_PROJECT_REF?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_URL?.match(
      /https:\/\/([a-z0-9]+)\.supabase\.co/
    )?.[1] ||
    "ruskhucrvjvuuzwlboqn"
  );
}

async function mgmtGet<T>(path: string): Promise<{ ok: true; data: T } | { ok: false; status: number; error: string }> {
  const token = requireToken();
  const res = await fetch(`https://api.supabase.com${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
    cache: "no-store",
  });
  const text = await res.text();
  if (!res.ok) {
    return { ok: false, status: res.status, error: text.slice(0, 400) };
  }
  try {
    return { ok: true, data: JSON.parse(text) as T };
  } catch {
    return { ok: false, status: res.status, error: "Invalid JSON from Management API" };
  }
}

export async function fetchProjectBillingAddons(projectRef: string) {
  return mgmtGet<MgmtAddonsResponse>(`/v1/projects/${projectRef}/billing/addons`);
}

export async function fetchOrganization(orgSlug: string) {
  return mgmtGet<{ id: string; name: string; plan?: string }>(
    `/v1/organizations/${orgSlug}`
  );
}

/** Invoice list — may 404 depending on Management API version / token scope. */
export async function fetchOrganizationInvoices(orgSlug: string) {
  for (const path of [
    `/v1/organizations/${orgSlug}/invoices?type=issued`,
    `/v1/organizations/${orgSlug}/invoices?type=all`,
    `/v1/organizations/${orgSlug}/billing/invoices`,
  ]) {
    const result = await mgmtGet<unknown>(path);
    if (result.ok) return { ...result, path };
  }
  return {
    ok: false as const,
    status: 404,
    error: "Invoice endpoints not available for this token/API version",
    path: null as string | null,
  };
}

/** Rough monthly USD for known Supabase plan names (platform fee, excl. compute). */
export function estimatePlanMonthlyUsd(plan: string | undefined | null): number | null {
  const p = (plan || "").toLowerCase();
  if (p === "pro") return 25;
  if (p === "team") return 599;
  if (p === "free") return 0;
  return null;
}

/**
 * Convert hourly USD addon to approximate monthly USD cents.
 * Supabase docs use ~730 hours/month for estimates.
 */
export function hourlyUsdToMonthlyCents(hourly: number): number {
  return Math.round(hourly * 730 * 100);
}
