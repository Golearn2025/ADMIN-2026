import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrg } from "@/lib/auth/org";
import { canManagePricing } from "@/lib/auth/pricing-access";
import { createAdminClient } from "@/lib/supabase/admin";

const DEFAULTS = {
  vat_rate: 0.2,
  vat_enabled: true,
  processor_fee_pct: 0.014,
  processor_fixed_fee_pence: 20,
  default_operational_reserve_pence: 0,
  hourly_operational_reserve_pence: 0,
  daily_operational_reserve_pence: 0,
  fleet_operational_reserve_pence: 0,
  low_margin_warning_pct: 0.1,
  minimum_profit_pence: 0,
} as const;

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

function penceToPoundsDisplay(value: unknown): number {
  const n = Number(value);
  if (Number.isNaN(n)) return 0;
  return Math.round(n) / 100;
}

function poundsToPence(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  if (Number.isNaN(n)) return null;
  return Math.max(Math.round(n * 100), 0);
}

function toResponse(
  organizationId: string,
  row: Record<string, unknown> | null,
  source: "organization_financial_settings" | "defaults"
) {
  const data = row ?? { organization_id: organizationId, ...DEFAULTS };
  return {
    organization_id: organizationId,
    vat_rate_percent: decimalToPctDisplay(data.vat_rate ?? DEFAULTS.vat_rate),
    vat_enabled: data.vat_enabled !== false,
    processor_fee_percent: decimalToPctDisplay(data.processor_fee_pct ?? DEFAULTS.processor_fee_pct),
    processor_fixed_fee_pounds: penceToPoundsDisplay(
      data.processor_fixed_fee_pence ?? DEFAULTS.processor_fixed_fee_pence
    ),
    default_operational_reserve_pounds: penceToPoundsDisplay(
      data.default_operational_reserve_pence ?? DEFAULTS.default_operational_reserve_pence
    ),
    hourly_operational_reserve_pounds: penceToPoundsDisplay(
      data.hourly_operational_reserve_pence ?? DEFAULTS.hourly_operational_reserve_pence
    ),
    daily_operational_reserve_pounds: penceToPoundsDisplay(
      data.daily_operational_reserve_pence ?? DEFAULTS.daily_operational_reserve_pence
    ),
    fleet_operational_reserve_pounds: penceToPoundsDisplay(
      data.fleet_operational_reserve_pence ?? DEFAULTS.fleet_operational_reserve_pence
    ),
    low_margin_warning_percent: decimalToPctDisplay(
      data.low_margin_warning_pct ?? DEFAULTS.low_margin_warning_pct
    ),
    minimum_profit_pounds: penceToPoundsDisplay(
      data.minimum_profit_pence ?? DEFAULTS.minimum_profit_pence
    ),
    source,
    note: "Phase 1B economics config — not wired to quote engine yet.",
  };
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
      .from("organization_financial_settings")
      .select(
        "organization_id, vat_rate, vat_enabled, processor_fee_pct, processor_fixed_fee_pence, default_operational_reserve_pence, hourly_operational_reserve_pence, daily_operational_reserve_pence, fleet_operational_reserve_pence, low_margin_warning_pct, minimum_profit_pence"
      )
      .eq("organization_id", orgId)
      .maybeSingle();

    if (error) {
      console.error("[organization-financial-settings][GET]", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(
      toResponse(orgId, settings, settings ? "organization_financial_settings" : "defaults")
    );
  } catch (error) {
    console.error("[organization-financial-settings][GET]", error);
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
        { error: "SUPABASE_SERVICE_ROLE_KEY required to update financial settings" },
        { status: 503 }
      );
    }

    const body = await request.json();
    const updates: Record<string, unknown> = {};

    if (body.vat_rate_percent !== undefined) {
      const v = pctToDecimal(body.vat_rate_percent);
      if (v === null) {
        return NextResponse.json({ error: "Invalid vat_rate_percent" }, { status: 400 });
      }
      updates.vat_rate = v;
    }
    if (body.vat_enabled !== undefined) {
      updates.vat_enabled = Boolean(body.vat_enabled);
    }
    if (body.processor_fee_percent !== undefined) {
      const v = pctToDecimal(body.processor_fee_percent);
      if (v === null) {
        return NextResponse.json({ error: "Invalid processor_fee_percent" }, { status: 400 });
      }
      updates.processor_fee_pct = v;
    }
    if (body.processor_fixed_fee_pounds !== undefined) {
      const v = poundsToPence(body.processor_fixed_fee_pounds);
      if (v === null) {
        return NextResponse.json({ error: "Invalid processor_fixed_fee_pounds" }, { status: 400 });
      }
      updates.processor_fixed_fee_pence = v;
    }
    if (body.default_operational_reserve_pounds !== undefined) {
      const v = poundsToPence(body.default_operational_reserve_pounds);
      if (v === null) {
        return NextResponse.json({ error: "Invalid default_operational_reserve_pounds" }, { status: 400 });
      }
      updates.default_operational_reserve_pence = v;
    }
    if (body.hourly_operational_reserve_pounds !== undefined) {
      const v = poundsToPence(body.hourly_operational_reserve_pounds);
      if (v === null) {
        return NextResponse.json({ error: "Invalid hourly_operational_reserve_pounds" }, { status: 400 });
      }
      updates.hourly_operational_reserve_pence = v;
    }
    if (body.daily_operational_reserve_pounds !== undefined) {
      const v = poundsToPence(body.daily_operational_reserve_pounds);
      if (v === null) {
        return NextResponse.json({ error: "Invalid daily_operational_reserve_pounds" }, { status: 400 });
      }
      updates.daily_operational_reserve_pence = v;
    }
    if (body.fleet_operational_reserve_pounds !== undefined) {
      const v = poundsToPence(body.fleet_operational_reserve_pounds);
      if (v === null) {
        return NextResponse.json({ error: "Invalid fleet_operational_reserve_pounds" }, { status: 400 });
      }
      updates.fleet_operational_reserve_pence = v;
    }
    if (body.low_margin_warning_percent !== undefined) {
      const v = pctToDecimal(body.low_margin_warning_percent);
      if (v === null) {
        return NextResponse.json({ error: "Invalid low_margin_warning_percent" }, { status: 400 });
      }
      updates.low_margin_warning_pct = v;
    }
    if (body.minimum_profit_pounds !== undefined) {
      const v = poundsToPence(body.minimum_profit_pounds);
      if (v === null) {
        return NextResponse.json({ error: "Invalid minimum_profit_pounds" }, { status: 400 });
      }
      updates.minimum_profit_pence = v;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    const { data: settings, error: upsertError } = await admin
      .from("organization_financial_settings")
      .upsert({ organization_id: orgId, ...updates }, { onConflict: "organization_id" })
      .select(
        "organization_id, vat_rate, vat_enabled, processor_fee_pct, processor_fixed_fee_pence, default_operational_reserve_pence, hourly_operational_reserve_pence, daily_operational_reserve_pence, fleet_operational_reserve_pence, low_margin_warning_pct, minimum_profit_pence"
      )
      .single();

    if (upsertError) {
      console.error("[organization-financial-settings][PATCH]", upsertError);
      return NextResponse.json({ error: upsertError.message }, { status: 500 });
    }

    return NextResponse.json(toResponse(orgId, settings, "organization_financial_settings"));
  } catch (error) {
    console.error("[organization-financial-settings][PATCH]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
