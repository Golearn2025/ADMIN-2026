import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrg } from "@/lib/auth/org";
import { canManagePricing } from "@/lib/auth/pricing-access";
import { createAdminClient } from "@/lib/supabase/admin";

function pctToDecimal(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  if (Number.isNaN(n)) return null;
  return Math.min(Math.max(n / 100, 0), 1);
}

function decimalToPctDisplay(value: unknown): number {
  const n = Number(value);
  if (Number.isNaN(n)) return 0;
  return Math.round(n * 10000) / 100;
}

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

    const { data: isSuperAdmin } = await supabase.rpc("get_user_super_admin_status", {
      user_id: user.id,
    });
    const canManage = await canManagePricing(supabase, user.id, Boolean(isSuperAdmin));
    if (!canManage) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const admin = createAdminClient();
    const db = admin ?? supabase;

    const { data: settings, error } = await db
      .from("organization_settings")
      .select(
        "organization_id, vat_rate, platform_commission_pct, operator_commission_pct, currency, timezone"
      )
      .eq("organization_id", orgId)
      .single();

    if (error) {
      console.error("[organization-settings][GET]", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      organization_id: settings.organization_id,
      currency: settings.currency ?? "GBP",
      timezone: settings.timezone ?? "Europe/London",
      vat_rate_percent: decimalToPctDisplay(settings.vat_rate),
      platform_commission_percent: decimalToPctDisplay(settings.platform_commission_pct),
      operator_commission_percent: decimalToPctDisplay(settings.operator_commission_pct),
      source: "organization_settings",
      note: "Used by pricing backend for quote VAT and commission preview.",
    });
  } catch (error) {
    console.error("[organization-settings][GET]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const admin = createAdminClient();
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

    const { data: isSuperAdmin } = await supabase.rpc("get_user_super_admin_status", {
      user_id: user.id,
    });
    const canManage = await canManagePricing(supabase, user.id, Boolean(isSuperAdmin));
    if (!canManage) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!admin) {
      return NextResponse.json(
        { error: "SUPABASE_SERVICE_ROLE_KEY required to update billing settings" },
        { status: 503 }
      );
    }

    const body = await request.json();
    const updates: Record<string, number> = {};

    if (body.vat_rate_percent !== undefined) {
      const v = pctToDecimal(body.vat_rate_percent);
      if (v === null) {
        return NextResponse.json({ error: "Invalid vat_rate_percent" }, { status: 400 });
      }
      updates.vat_rate = v;
    }
    if (body.platform_commission_percent !== undefined) {
      const v = pctToDecimal(body.platform_commission_percent);
      if (v === null) {
        return NextResponse.json({ error: "Invalid platform_commission_percent" }, { status: 400 });
      }
      updates.platform_commission_pct = v;
    }
    if (body.operator_commission_percent !== undefined) {
      const v = pctToDecimal(body.operator_commission_percent);
      if (v === null) {
        return NextResponse.json({ error: "Invalid operator_commission_percent" }, { status: 400 });
      }
      updates.operator_commission_pct = v;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    const { data: settings, error: updateError } = await admin
      .from("organization_settings")
      .update(updates)
      .eq("organization_id", orgId)
      .select(
        "organization_id, vat_rate, platform_commission_pct, operator_commission_pct, currency, timezone"
      )
      .single();

    if (updateError) {
      console.error("[organization-settings][PATCH]", updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    const platformPct = decimalToPctDisplay(settings.platform_commission_pct);
    const operatorPct = decimalToPctDisplay(settings.operator_commission_pct);

    const { data: profiles } = await admin
      .from("pricing_commission_profiles")
      .select("id")
      .eq("organization_id", orgId)
      .eq("active", true);

    if (profiles?.length) {
      for (const row of profiles) {
        await admin
          .from("pricing_commission_profiles")
          .update({
            platform_fee_percent: platformPct,
            operator_fee_percent: operatorPct,
          })
          .eq("id", row.id);
      }
    }

    return NextResponse.json({
      organization_id: settings.organization_id,
      vat_rate_percent: decimalToPctDisplay(settings.vat_rate),
      platform_commission_percent: platformPct,
      operator_commission_percent: operatorPct,
      synced_commission_profiles: profiles?.length ?? 0,
    });
  } catch (error) {
    console.error("[organization-settings][PATCH]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
