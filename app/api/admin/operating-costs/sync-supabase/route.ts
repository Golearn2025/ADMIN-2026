/**
 * POST /api/admin/operating-costs/sync-supabase
 * Pulls org plan + project billing addons from Management API into operating_costs.
 * Historical Stripe-style invoice list is attempted; reports if unavailable.
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentOrg } from "@/lib/auth/org";
import {
  estimatePlanMonthlyUsd,
  fetchOrganization,
  fetchOrganizationInvoices,
  fetchProjectBillingAddons,
  getSupabaseOrgSlug,
  getSupabaseProjectRef,
  hourlyUsdToMonthlyCents,
} from "@/lib/operating-costs/supabase-mgmt";

type UpsertItem = {
  invoice_ref: string;
  vendor_name: string;
  category: string;
  description: string;
  amount_pence: number;
  currency: string;
  cadence: "monthly" | "one_time";
  is_usage_based: boolean;
  notes: string;
};

async function resolveSupabaseCatalogId(
  admin: NonNullable<ReturnType<typeof createAdminClient>>
): Promise<string | null> {
  const { data } = await admin
    .from("operating_cost_catalog")
    .select("id")
    .eq("slug", "supabase")
    .maybeSingle();
  return data?.id ?? null;
}

export async function POST() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const orgId = await getCurrentOrg(supabase, user.id);
    if (!orgId) {
      return NextResponse.json({ error: "No organization selected" }, { status: 400 });
    }

    if (!process.env.SUPABASE_ACCESS_TOKEN) {
      return NextResponse.json(
        { error: "SUPABASE_ACCESS_TOKEN missing in server env" },
        { status: 500 }
      );
    }

    const admin = createAdminClient();
    if (!admin) {
      return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });
    }

    const orgSlug = getSupabaseOrgSlug();
    const projectRef = getSupabaseProjectRef();
    const catalogId = await resolveSupabaseCatalogId(admin);
    const today = new Date().toISOString().slice(0, 10);

    const items: UpsertItem[] = [];
    const warnings: string[] = [];

    // ── Org plan ──────────────────────────────────────────────
    const orgRes = await fetchOrganization(orgSlug);
    if (orgRes.ok) {
      const plan = orgRes.data.plan || "unknown";
      const monthlyUsd = estimatePlanMonthlyUsd(plan);
      if (monthlyUsd != null && monthlyUsd > 0) {
        items.push({
          invoice_ref: `supabase-plan:${plan}:${projectRef}`,
          vendor_name: "Supabase",
          category: "hosting",
          description: `Supabase ${plan} plan (org ${orgRes.data.name})`,
          amount_pence: Math.round(monthlyUsd * 100),
          currency: "USD",
          cadence: "monthly",
          is_usage_based: false,
          notes: `Synced from Management API · org ${orgSlug} · project ${projectRef}`,
        });
      } else if (monthlyUsd === 0) {
        warnings.push(`Org plan is free — no platform fee row created.`);
      } else {
        warnings.push(`Unknown plan "${plan}" — skipped plan fee estimate.`);
      }
    } else {
      warnings.push(`Org fetch failed (${orgRes.status}): ${orgRes.error}`);
    }

    // ── Project addons (compute etc.) ─────────────────────────
    const addonsRes = await fetchProjectBillingAddons(projectRef);
    if (addonsRes.ok) {
      for (const addon of addonsRes.data.selected_addons || []) {
        const variant = addon.variant || {};
        const price = variant.price || {};
        const variantId = variant.id || addon.type || "unknown";
        let monthlyCents = 0;
        if (price.interval === "hourly" && typeof price.amount === "number") {
          monthlyCents = hourlyUsdToMonthlyCents(price.amount);
        } else if (price.interval === "monthly" && typeof price.amount === "number") {
          monthlyCents = Math.round(price.amount * 100);
        }

        items.push({
          invoice_ref: `supabase-addon:${variantId}:${projectRef}`,
          vendor_name: "Supabase",
          category: "hosting",
          description:
            price.description ||
            `${addon.type || "addon"} · ${variant.name || variantId}`,
          amount_pence: monthlyCents,
          currency: "USD",
          cadence: "monthly",
          is_usage_based: price.type === "usage" || price.interval === "hourly",
          notes: `Synced addon from Management API · ${addon.type}/${variantId}`,
        });
      }
      if (!(addonsRes.data.selected_addons || []).length) {
        warnings.push("No selected billing addons on this project.");
      }
    } else {
      warnings.push(`Addons fetch failed (${addonsRes.status}): ${addonsRes.error}`);
    }

    // ── Historical invoices (best effort) ─────────────────────
    const invRes = await fetchOrganizationInvoices(orgSlug);
    let invoicesImported = 0;
    let invoicesAvailable = false;
    if (invRes.ok) {
      invoicesAvailable = true;
      const raw = invRes.data as { invoices?: unknown[] } | unknown[];
      const list = Array.isArray(raw)
        ? raw
        : Array.isArray((raw as { invoices?: unknown[] }).invoices)
          ? (raw as { invoices: unknown[] }).invoices
          : [];
      for (const row of list) {
        if (!row || typeof row !== "object") continue;
        const inv = row as Record<string, unknown>;
        const number =
          (inv.invoice_number as string) ||
          (inv.number as string) ||
          (inv.id as string) ||
          null;
        if (!number) continue;
        const amountDue =
          Number(inv.amount_due ?? inv.subtotal ?? inv.amount ?? 0) || 0;
        // Supabase may return minor units or major — if > 10000 treat as cents already unlikely; prefer dollars*100 if small
        const amountCents =
          amountDue > 0 && amountDue < 500
            ? Math.round(amountDue * 100)
            : Math.round(amountDue);

        items.push({
          invoice_ref: `supabase-invoice:${number}`,
          vendor_name: "Supabase",
          category: "hosting",
          description: `Supabase invoice ${number}`,
          amount_pence: amountCents,
          currency: "USD",
          cadence: "one_time",
          is_usage_based: true,
          notes: `Synced invoice · paid_at=${String(inv.paid_at || "")} · due=${String(inv.due_date || "")}`,
        });
        invoicesImported += 1;
      }
    } else {
      warnings.push(
        `Invoice list unavailable (${invRes.status}). Use dashboard CSV for the historical 17 invoices until the endpoint is exposed.`
      );
    }

    // ── Upsert by invoice_ref ─────────────────────────────────
    let created = 0;
    let updated = 0;

    for (const item of items) {
      const { data: existing } = await admin
        .from("operating_costs")
        .select("id")
        .eq("organization_id", orgId)
        .eq("invoice_ref", item.invoice_ref)
        .is("deleted_at", null)
        .maybeSingle();

      if (existing?.id) {
        const { error } = await admin
          .from("operating_costs")
          .update({
            vendor_name: item.vendor_name,
            category: item.category,
            description: item.description,
            amount_pence: item.amount_pence,
            currency: item.currency,
            cadence: item.cadence,
            is_usage_based: item.is_usage_based,
            notes: item.notes,
            status: "active",
            catalog_id: catalogId,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id);
        if (error) {
          warnings.push(`Update failed ${item.invoice_ref}: ${error.message}`);
        } else {
          updated += 1;
        }
      } else {
        const { error } = await admin.from("operating_costs").insert({
          organization_id: orgId,
          catalog_id: catalogId,
          vendor_name: item.vendor_name,
          category: item.category,
          description: item.description,
          amount_pence: item.amount_pence,
          currency: item.currency,
          cadence: item.cadence,
          is_usage_based: item.is_usage_based,
          invoice_ref: item.invoice_ref,
          notes: item.notes,
          start_date: today,
          status: "active",
          payment_status: "unpaid",
          created_by: user.id,
        });
        if (error) {
          warnings.push(`Insert failed ${item.invoice_ref}: ${error.message}`);
        } else {
          created += 1;
        }
      }
    }

    return NextResponse.json({
      success: true,
      orgSlug,
      projectRef,
      created,
      updated,
      invoicesAvailable,
      invoicesImported,
      warnings,
    });
  } catch (err) {
    console.error("[sync-supabase]", err);
    const msg = err instanceof Error ? err.message : "Sync failed";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
