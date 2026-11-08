/**
 * GET  /api/admin/operating-costs — list + summary + catalog status (SSOT views)
 * POST /api/admin/operating-costs — create expense
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentOrg } from "@/lib/auth/org";
import { buildGbpSummary, enrichCostsWithGbp } from "@/lib/operating-costs/gbp-summary";
import { withGbpFields } from "@/lib/operating-costs/with-gbp";
import type { OperatingCostRow } from "@/lib/operating-costs/types";

const CADENCES = new Set([
  "one_time",
  "daily",
  "weekly",
  "monthly",
  "yearly",
  "multi_year",
]);

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
    if (!orgId) {
      return NextResponse.json({ error: "No organization selected" }, { status: 400 });
    }

    const admin = createAdminClient();
    if (!admin) {
      return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });
    }

    const [costsRes, catalogRes] = await Promise.all([
      admin
        .from("admin_operating_costs_list")
        .select("*")
        .eq("organization_id", orgId)
        .order("start_date", { ascending: false }),
      admin
        .from("admin_operating_cost_catalog")
        .select("*")
        .order("sort_order", { ascending: true }),
    ]);

    if (costsRes.error) {
      return NextResponse.json({ error: costsRes.error.message }, { status: 500 });
    }
    if (catalogRes.error) {
      return NextResponse.json({ error: catalogRes.error.message }, { status: 500 });
    }

    const costs = await enrichCostsWithGbp(
      (costsRes.data || []) as OperatingCostRow[],
      admin
    );
    const summary = buildGbpSummary(orgId, costs);

    const byCatalog = new Map<string, { count: number; active: boolean }>();
    for (const row of costs) {
      if (!row.catalog_id) continue;
      const prev = byCatalog.get(row.catalog_id) || { count: 0, active: false };
      prev.count += 1;
      if (row.status === "active") prev.active = true;
      byCatalog.set(row.catalog_id, prev);
    }

    const catalog = (catalogRes.data || []).map((item) => {
      const hit = byCatalog.get(item.catalog_id);
      return {
        ...item,
        entries_count: hit?.count || 0,
        has_active_entry: Boolean(hit?.active),
      };
    });

    return NextResponse.json({ costs, summary, catalog });
  } catch (err) {
    console.error("[operating-costs GET]", err);
    return NextResponse.json({ error: "Failed to load costs" }, { status: 500 });
  }
}

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

    const admin = createAdminClient();
    if (!admin) {
      return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });
    }

    const body = await req.json().catch(() => ({}));
    const vendorName =
      typeof body.vendorName === "string" ? body.vendorName.trim() : "";
    const amountPounds = Number(body.amountPounds);
    const cadence = typeof body.cadence === "string" ? body.cadence : "monthly";

    if (!vendorName) {
      return NextResponse.json({ error: "vendorName is required" }, { status: 400 });
    }
    if (!Number.isFinite(amountPounds) || amountPounds < 0) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }
    if (!CADENCES.has(cadence)) {
      return NextResponse.json({ error: "Invalid cadence" }, { status: 400 });
    }

    let amortizeMonths: number | null =
      body.amortizeMonths != null && body.amortizeMonths !== ""
        ? Number(body.amortizeMonths)
        : null;
    if (cadence === "multi_year" && (!amortizeMonths || amortizeMonths <= 0)) {
      return NextResponse.json(
        { error: "amortizeMonths required for multi_year (e.g. 60 for 5 years)" },
        { status: 400 }
      );
    }
    if (amortizeMonths != null && (!Number.isFinite(amortizeMonths) || amortizeMonths <= 0)) {
      amortizeMonths = null;
    }

    const amount_pence = Math.round(amountPounds * 100);
    const start_date =
      typeof body.startDate === "string" && body.startDate
        ? body.startDate
        : new Date().toISOString().slice(0, 10);
    const currency =
      typeof body.currency === "string" && body.currency.trim()
        ? body.currency.trim().toUpperCase()
        : "GBP";
    const gbp = await withGbpFields({ amount_pence, currency, start_date });

    const insert = {
      organization_id: orgId,
      catalog_id: typeof body.catalogId === "string" && body.catalogId ? body.catalogId : null,
      vendor_name: vendorName,
      category: typeof body.category === "string" && body.category ? body.category : "other",
      description: typeof body.description === "string" ? body.description.trim() || null : null,
      amount_pence,
      currency,
      ...gbp,
      cadence,
      amortize_months: amortizeMonths,
      start_date,
      end_date: typeof body.endDate === "string" && body.endDate ? body.endDate : null,
      is_usage_based: Boolean(body.isUsageBased),
      invoice_ref: typeof body.invoiceRef === "string" ? body.invoiceRef.trim() || null : null,
      notes: typeof body.notes === "string" ? body.notes.trim() || null : null,
      status: "active",
      payment_status:
        body.paymentStatus === "paid" || body.payment_status === "paid" ? "paid" : "unpaid",
      created_by: user.id,
    };

    const { data, error } = await admin
      .from("operating_costs")
      .insert(insert)
      .select("id")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, id: data.id });
  } catch (err) {
    console.error("[operating-costs POST]", err);
    return NextResponse.json({ error: "Failed to create cost" }, { status: 500 });
  }
}
