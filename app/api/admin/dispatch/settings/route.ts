/**
 * GET/PATCH /api/admin/dispatch/settings
 * Job Dispatch org settings + premium driver list.
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentOrg } from "@/lib/auth/org";

const FALLBACK_ORG = "9a5caade-4791-4860-93b5-12b1c4fa9830";

async function resolveOrgId() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" as const, status: 401 as const };

  const orgId = (await getCurrentOrg(supabase, user.id)) || FALLBACK_ORG;
  return { supabase, user, orgId, admin: createAdminClient() };
}

export async function GET() {
  try {
    const ctx = await resolveOrgId();
    if ("error" in ctx) {
      return NextResponse.json({ error: ctx.error }, { status: ctx.status });
    }
    const db = ctx.admin ?? ctx.supabase;

    let { data: settings, error: settingsErr } = await db
      .from("dispatch_org_settings")
      .select("*")
      .eq("organization_id", ctx.orgId)
      .maybeSingle();

    if (settingsErr) {
      return NextResponse.json({ error: settingsErr.message }, { status: 500 });
    }

    if (!settings) {
      const { data: created, error: createErr } = await db
        .from("dispatch_org_settings")
        .upsert({ organization_id: ctx.orgId }, { onConflict: "organization_id" })
        .select("*")
        .single();
      if (createErr) {
        return NextResponse.json({ error: createErr.message }, { status: 500 });
      }
      settings = created;
    }

    const { data: premiumRows, error: premiumErr } = await db
      .from("dispatch_premium_drivers")
      .select("driver_id, created_at")
      .eq("organization_id", ctx.orgId)
      .order("created_at", { ascending: true });

    if (premiumErr) {
      return NextResponse.json({ error: premiumErr.message }, { status: 500 });
    }

    const driverIds = (premiumRows || []).map((r) => r.driver_id);
    let drivers: Array<{
      id: string;
      name: string;
      phone: string | null;
      status: string | null;
    }> = [];

    if (driverIds.length) {
      const { data: driverRows } = await db
        .from("drivers")
        .select("id, first_name, last_name, phone, status")
        .in("id", driverIds)
        .is("deleted_at", null);
      drivers = (driverRows || []).map((d) => ({
        id: d.id,
        name: `${d.first_name || ""} ${d.last_name || ""}`.trim() || "Driver",
        phone: d.phone,
        status: d.status,
      }));
    }

    return NextResponse.json({
      organizationId: ctx.orgId,
      settings: {
        wavesEnabledManual: settings.waves_enabled_manual,
        wavesEnabledAutomatic: settings.waves_enabled_automatic,
        defaultManualMode: settings.default_manual_mode,
        directWaitMinutes: settings.direct_wait_minutes,
        premiumWaitMinutes: settings.premium_wait_minutes,
        directToPremiumManual: settings.direct_to_premium_manual,
      },
      premiumDrivers: drivers,
    });
  } catch (err) {
    console.error("[dispatch/settings GET]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const ctx = await resolveOrgId();
    if ("error" in ctx) {
      return NextResponse.json({ error: ctx.error }, { status: ctx.status });
    }
    const db = ctx.admin ?? ctx.supabase;
    const body = await req.json().catch(() => ({}));

    const patch: Record<string, unknown> = {
      organization_id: ctx.orgId,
      updated_at: new Date().toISOString(),
    };

    if (typeof body.wavesEnabledManual === "boolean") {
      patch.waves_enabled_manual = body.wavesEnabledManual;
    }
    if (typeof body.wavesEnabledAutomatic === "boolean") {
      patch.waves_enabled_automatic = body.wavesEnabledAutomatic;
    }
    if (
      body.defaultManualMode === "open" ||
      body.defaultManualMode === "direct" ||
      body.defaultManualMode === "waves"
    ) {
      patch.default_manual_mode = body.defaultManualMode;
    }
    if (body.directWaitMinutes != null) {
      const n = Math.round(Number(body.directWaitMinutes));
      if (!Number.isFinite(n) || n < 1 || n > 240) {
        return NextResponse.json(
          { error: "directWaitMinutes must be 1–240" },
          { status: 400 }
        );
      }
      patch.direct_wait_minutes = n;
    }
    if (body.premiumWaitMinutes != null) {
      const n = Math.round(Number(body.premiumWaitMinutes));
      if (!Number.isFinite(n) || n < 1 || n > 240) {
        return NextResponse.json(
          { error: "premiumWaitMinutes must be 1–240" },
          { status: 400 }
        );
      }
      patch.premium_wait_minutes = n;
    }
    if (typeof body.directToPremiumManual === "boolean") {
      patch.direct_to_premium_manual = body.directToPremiumManual;
    }

    const { data, error } = await db
      .from("dispatch_org_settings")
      .upsert(patch, { onConflict: "organization_id" })
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      settings: {
        wavesEnabledManual: data.waves_enabled_manual,
        wavesEnabledAutomatic: data.waves_enabled_automatic,
        defaultManualMode: data.default_manual_mode,
        directWaitMinutes: data.direct_wait_minutes,
        premiumWaitMinutes: data.premium_wait_minutes,
        directToPremiumManual: data.direct_to_premium_manual,
      },
    });
  } catch (err) {
    console.error("[dispatch/settings PATCH]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
