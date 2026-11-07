/**
 * POST /api/admin/operating-costs/bulk-import
 * Paste-import invoice lines (no CSV file needed).
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentOrg } from "@/lib/auth/org";
import { parseBulkExpenseLines } from "@/lib/operating-costs/parse-bulk-expenses";

export async function POST(req: NextRequest) {
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

    const admin = createAdminClient();
    if (!admin) {
      return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });
    }

    const body = await req.json().catch(() => ({}));
    const text = typeof body.text === "string" ? body.text : "";
    const vendorName =
      typeof body.vendorName === "string" && body.vendorName.trim()
        ? body.vendorName.trim()
        : "Supabase";
    const category =
      typeof body.category === "string" && body.category.trim()
        ? body.category.trim()
        : "hosting";
    const cadence =
      typeof body.cadence === "string" && body.cadence.trim()
        ? body.cadence.trim()
        : "one_time";

    const parsed = parseBulkExpenseLines(text);
    if (!parsed.length) {
      return NextResponse.json({ error: "No lines to import" }, { status: 400 });
    }

    const invalid = parsed.filter((p) => p.error);
    const valid = parsed.filter((p) => !p.error);
    if (!valid.length) {
      return NextResponse.json(
        {
          error: "No valid lines",
          invalid: invalid.map((p) => ({ raw: p.raw, error: p.error })),
        },
        { status: 400 }
      );
    }

    const { data: catalog } = await admin
      .from("operating_cost_catalog")
      .select("id")
      .eq("slug", "supabase")
      .maybeSingle();

    let created = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const row of valid) {
      const invoiceRef = row.invoiceRef
        ? `supabase-invoice:${row.invoiceRef}`
        : `supabase-invoice:${row.startDate}:${Math.round(row.amountMajor * 100)}`;

      const { data: existing } = await admin
        .from("operating_costs")
        .select("id")
        .eq("organization_id", orgId)
        .eq("invoice_ref", invoiceRef)
        .is("deleted_at", null)
        .maybeSingle();

      if (existing?.id) {
        skipped += 1;
        continue;
      }

      const { error } = await admin.from("operating_costs").insert({
        organization_id: orgId,
        catalog_id: catalog?.id ?? null,
        vendor_name: vendorName,
        category,
        description: row.description || `Imported invoice ${row.invoiceRef || row.startDate}`,
        amount_pence: Math.round(row.amountMajor * 100),
        currency: row.currency || "USD",
        cadence,
        start_date: row.startDate,
        is_usage_based: true,
        invoice_ref: invoiceRef,
        notes: "Bulk paste import",
        status: "active",
        payment_status: "paid",
        created_by: user.id,
      });

      if (error) {
        errors.push(`${row.raw}: ${error.message}`);
      } else {
        created += 1;
      }
    }

    return NextResponse.json({
      success: true,
      created,
      skipped,
      invalidCount: invalid.length,
      invalid: invalid.map((p) => ({ raw: p.raw, error: p.error })),
      errors,
    });
  } catch (err) {
    console.error("[bulk-import]", err);
    return NextResponse.json({ error: "Bulk import failed" }, { status: 500 });
  }
}
