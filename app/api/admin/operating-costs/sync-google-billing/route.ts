/**
 * POST /api/admin/operating-costs/sync-google-billing
 * Pulls monthly Maps / GCP costs from BigQuery billing export into operating_costs.
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentOrg } from "@/lib/auth/org";
import {
  classifyGoogleService,
  fetchMonthlyServiceCosts,
  getGoogleBillingConfig,
  invoiceMonthToDate,
  majorToMinor,
} from "@/lib/operating-costs/google-billing";
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

    const cfg = getGoogleBillingConfig();
    if (!cfg.billingAccountId) {
      return NextResponse.json(
        { error: "GOOGLE_BILLING_ACCOUNT_ID missing in server env" },
        { status: 500 }
      );
    }

    const admin = createAdminClient();
    if (!admin) {
      return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });
    }

    const { data: catalogs } = await admin
      .from("operating_cost_catalog")
      .select("id, slug")
      .in("slug", ["google-maps", "google-cloud"]);

    const catalogBySlug = new Map(
      (catalogs || []).map((c: { id: string; slug: string }) => [c.slug, c.id])
    );

    const fetched = await fetchMonthlyServiceCosts();
    if (!fetched.rows.length) {
      return NextResponse.json({
        success: true,
        created: 0,
        updated: 0,
        skipped: 0,
        tableId: fetched.tableId,
        dataset: cfg.datasetId,
        pending: true,
        message:
          fetched.emptyReason ||
          "No billing rows yet. Standard export can take up to 24h after enable.",
      });
    }

    // Roll up by month + catalog bucket (maps vs other cloud)
    type Agg = {
      invoiceMonth: string;
      catalogSlug: "google-maps" | "google-cloud";
      vendorName: string;
      category: string;
      currency: string;
      netCost: number;
      services: string[];
    };
    const agg = new Map<string, Agg>();

    for (const row of fetched.rows) {
      if (!row.invoiceMonth || row.netCost === 0) continue;
      const cls = classifyGoogleService(row.serviceName);
      const key = `${row.invoiceMonth}:${cls.catalogSlug}:${row.currency}`;
      const prev = agg.get(key);
      if (prev) {
        prev.netCost += row.netCost;
        if (!prev.services.includes(row.serviceName)) prev.services.push(row.serviceName);
      } else {
        agg.set(key, {
          invoiceMonth: row.invoiceMonth,
          catalogSlug: cls.catalogSlug,
          vendorName: cls.vendorName,
          category: cls.category,
          currency: row.currency,
          netCost: row.netCost,
          services: [row.serviceName],
        });
      }
    }

    const nowYm = new Date().toISOString().slice(0, 7).replace("-", "");
    let created = 0;
    let updated = 0;
    let skipped = 0;
    const warnings: string[] = [];

    for (const item of agg.values()) {
      const amountMinor = majorToMinor(item.netCost);
      if (amountMinor <= 0) {
        skipped += 1;
        continue;
      }

      const invoiceRef = `google-billing:${item.invoiceMonth}:${item.catalogSlug}`;
      const startDate = invoiceMonthToDate(item.invoiceMonth);
      const isCurrentMonth = item.invoiceMonth === nowYm;
      const paymentStatus = isCurrentMonth ? "unpaid" : "paid";
      const catalogId = catalogBySlug.get(item.catalogSlug) ?? null;

      const gbp = await withGbpFields({
        amount_pence: amountMinor,
        currency: item.currency,
        start_date: startDate,
      });
      const payload = {
        organization_id: orgId,
        catalog_id: catalogId,
        vendor_name: item.vendorName,
        category: item.category,
        description: `${item.vendorName} · ${item.invoiceMonth} (${item.services.slice(0, 4).join(", ")}${item.services.length > 4 ? "…" : ""})`,
        amount_pence: amountMinor,
        currency: item.currency,
        ...gbp,
        cadence: "one_time" as const,
        start_date: startDate,
        end_date: startDate,
        is_usage_based: true,
        invoice_ref: invoiceRef,
        notes: `Synced from BigQuery ${cfg.datasetId}.${fetched.tableId}`,
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
            // keep user payment_status if they toggled; only set on create
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
      months: agg.size,
      tableId: fetched.tableId,
      dataset: cfg.datasetId,
      pending: false,
      warnings,
    });
  } catch (err) {
    console.error("[sync-google-billing]", err);
    const msg = err instanceof Error ? err.message : "Sync failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
