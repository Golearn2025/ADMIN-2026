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

    const db = createAdminClient() ?? supabase;

    const [{ data: org }, { data: config }, { data: tiers }] = await Promise.all([
      db.from("organizations").select("id, name, org_type").eq("id", orgId).single(),
      db.from("partner_revenue_share_configs").select("*").eq("organization_id", orgId).maybeSingle(),
      db
        .from("partner_revenue_share_tiers")
        .select("*")
        .eq("organization_id", orgId)
        .order("sort_order", { ascending: true }),
    ]);

    return NextResponse.json({
      organization: org,
      config: config
        ? {
            is_enabled: config.is_enabled,
            share_basis: config.share_basis,
            tier_period: config.tier_period,
          }
        : {
            is_enabled: false,
            share_basis: "contribution_margin",
            tier_period: "calendar_month",
          },
      tiers: (tiers ?? []).map((t) => ({
        id: t.id,
        min_bookings: t.min_bookings,
        max_bookings: t.max_bookings,
        share_percent: decimalToPctDisplay(t.share_pct),
        sort_order: t.sort_order,
        is_active: t.is_active,
      })),
    });
  } catch (error) {
    console.error("partner-revenue-share GET:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
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

    const body = await request.json();
    const db = createAdminClient() ?? supabase;

    const updates: Record<string, unknown> = { organization_id: orgId, updated_at: new Date().toISOString() };
    if (body.is_enabled !== undefined) updates.is_enabled = Boolean(body.is_enabled);
    if (body.share_basis !== undefined) updates.share_basis = body.share_basis;
    if (body.tier_period !== undefined) updates.tier_period = body.tier_period;

    const { error } = await db
      .from("partner_revenue_share_configs")
      .upsert(updates, { onConflict: "organization_id" });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (Array.isArray(body.tiers)) {
      for (const tier of body.tiers) {
        const sharePct = pctToDecimal(tier.share_percent);
        if (sharePct === null) continue;
        const row = {
          organization_id: orgId,
          min_bookings: Number(tier.min_bookings) || 0,
          max_bookings: tier.max_bookings === null || tier.max_bookings === "" ? null : Number(tier.max_bookings),
          share_pct: sharePct,
          sort_order: Number(tier.sort_order) || 1,
          is_active: tier.is_active !== false,
          updated_at: new Date().toISOString(),
        };
        if (tier.id) {
          await db.from("partner_revenue_share_tiers").update(row).eq("id", tier.id);
        } else {
          await db.from("partner_revenue_share_tiers").insert(row);
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("partner-revenue-share PATCH:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
