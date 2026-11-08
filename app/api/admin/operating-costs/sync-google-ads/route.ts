/**
 * POST /api/admin/operating-costs/sync-google-ads
 * Pulls monthly Google Ads spend into operating_costs (catalog: marketing-ads).
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentOrg } from "@/lib/auth/org";
import {
  fetchGoogleAdsMonthlySpend,
  getGoogleAdsConfig,
  googleAdsConfigured,
} from "@/lib/operating-costs/google-ads";
import { withGbpFields } from "@/lib/operating-costs/with-gbp";

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

    if (!googleAdsConfigured()) {
      return NextResponse.json(
        {
          error:
            "Google Ads OAuth incomplete. Set GOOGLE_ADS_CLIENT_ID, CLIENT_SECRET, REFRESH_TOKEN then retry.",
          needOAuth: true,
        },
        { status: 400 }
      );
    }

    const admin = createAdminClient();
    if (!admin) {
      return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });
    }

    const { data: catalog } = await admin
      .from("operating_cost_catalog")
      .select("id")
      .eq("slug", "marketing-ads")
      .maybeSingle();

    const { rows } = await fetchGoogleAdsMonthlySpend();
    const cfg = getGoogleAdsConfig();
    const nowYm = new Date().toISOString().slice(0, 7).replace("-", "");

    let created = 0;
    let updated = 0;
    let skipped = 0;
    const warnings: string[] = [];

    for (const row of rows) {
      const amountMinor = Math.round(row.amountMajor * 100);
      if (amountMinor <= 0) {
        skipped += 1;
        continue;
      }

      const invoiceRef = `google-ads:${row.invoiceMonth}`;
      const paymentStatus = row.invoiceMonth === nowYm ? "unpaid" : "paid";

      // Prefer official Billing invoice rows (Drive / Documents) over API spend for the same month.
      const { data: officialInvoice } = await admin
        .from("operating_costs")
        .select("id, invoice_ref")
        .eq("organization_id", orgId)
        .eq("vendor_name", "Google Ads")
        .eq("start_date", row.startDate)
        .ilike("invoice_ref", "google-ads-invoice:%")
        .is("deleted_at", null)
        .maybeSingle();

      if (officialInvoice?.id) {
        skipped += 1;
        continue;
      }

      const gbp = await withGbpFields({
        amount_pence: amountMinor,
        currency: row.currency,
        start_date: row.startDate,
      });
      const payload = {
        organization_id: orgId,
        catalog_id: catalog?.id ?? null,
        vendor_name: "Google Ads",
        category: "marketing",
        description: `Google Ads spend · ${row.invoiceMonth}`,
        amount_pence: amountMinor,
        currency: row.currency,
        ...gbp,
        cadence: "one_time" as const,
        start_date: row.startDate,
        end_date: row.startDate,
        is_usage_based: true,
        invoice_ref: invoiceRef,
        notes: `Synced from Google Ads API (customer ${cfg.customerId})`,
        status: "active" as const,
        payment_status: paymentStatus,
        updated_at: new Date().toISOString(),
      };

      const { data: existing } = await admin
        .from("operating_costs")
        .select("id")
        .eq("organization_id", orgId)
        .eq("invoice_ref", invoiceRef)
        .is("deleted_at", null)
        .maybeSingle();

      if (existing?.id) {
        const { error } = await admin
          .from("operating_costs")
          .update({
            catalog_id: payload.catalog_id,
            vendor_name: payload.vendor_name,
            category: payload.category,
            description: payload.description,
            amount_pence: payload.amount_pence,
            currency: payload.currency,
            amount_gbp_pence: payload.amount_gbp_pence,
            fx_rate_to_gbp: payload.fx_rate_to_gbp,
            fx_as_of: payload.fx_as_of,
            notes: payload.notes,
            updated_at: payload.updated_at,
          })
          .eq("id", existing.id);
        if (error) warnings.push(`${invoiceRef}: ${error.message}`);
        else updated += 1;
      } else {
        const { error } = await admin.from("operating_costs").insert({
          ...payload,
          created_by: user.id,
        });
        if (error) warnings.push(`${invoiceRef}: ${error.message}`);
        else created += 1;
      }
    }

    return NextResponse.json({
      success: true,
      created,
      updated,
      skipped,
      months: rows.length,
      customerId: cfg.customerId,
      warnings,
    });
  } catch (err) {
    console.error("[sync-google-ads]", err);
    const msg = err instanceof Error ? err.message : "Google Ads sync failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
