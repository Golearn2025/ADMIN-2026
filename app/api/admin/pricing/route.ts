import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrg } from "@/lib/auth/org";
import { canManagePricing } from "@/lib/auth/pricing-access";
import { createAdminClient } from "@/lib/supabase/admin";

const ALLOWED_TABLES = [
  "pricing_versions",
  "pricing_vehicle_rates",
  "pricing_hourly_rules",
  "pricing_daily_rules",
  "pricing_time_rules",
  "pricing_airport_fees",
  "pricing_zone_fees",
  "pricing_return_rules",
  "pricing_fleet_discounts",
  "pricing_rounding_rules",
  "pricing_commission_profiles",
  // Driver payout tiers (global — no organization_id)
  "payout_escalation_tiers",
  // Extra services (global — no organization_id)
  "service_items",
  "service_item_payout_rules",
  "service_suppliers",
] as const;
const VERSIONED_TABLES = new Set<string>([
  "pricing_vehicle_rates",
  "pricing_hourly_rules",
  "pricing_daily_rules",
  "pricing_time_rules",
  "pricing_airport_fees",
  "pricing_zone_fees",
  "pricing_rounding_rules",
  "payout_escalation_tiers",
]);
// Tables without organization_id column — skip org filter in GET, super-admin only in PATCH
const GLOBAL_TABLES = new Set<string>([
  "payout_escalation_tiers",
  "service_items",
  "service_item_payout_rules",
  "service_suppliers",
]);
const CREATABLE_TABLES = new Set<string>([
  "payout_escalation_tiers",
  "service_suppliers",
  "service_item_payout_rules",
]);
// Global tables that have no organization_id column (PATCH/POST select)
const GLOBAL_NO_ORG_TABLES = new Set<string>([
  "payout_escalation_tiers",
  "service_items",
  "service_suppliers",
]);

type AllowedTable = (typeof ALLOWED_TABLES)[number];

function isAllowedTable(value: string): value is AllowedTable {
  return (ALLOWED_TABLES as readonly string[]).includes(value);
}

const IMMUTABLE_PATCH_COLUMNS = new Set([
  "id",
  "organization_id",
  "created_at",
  "updated_at",
  "pricing_version_id",
  "tier_group",
  "vehicle_category_id",
]);

function pickUpdates(updates: Record<string, unknown>): Record<string, unknown> {
  const payload: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(updates)) {
    if (!IMMUTABLE_PATCH_COLUMNS.has(key)) {
      payload[key] = value;
    }
  }
  return payload;
}

function writeDb(admin: ReturnType<typeof createAdminClient>, table: string) {
  if (GLOBAL_TABLES.has(table) && !admin) {
    return null;
  }
  return admin ?? null;
}

export async function GET(request: NextRequest) {
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

    const currentOrgId = await getCurrentOrg(supabase, user.id);
    const { searchParams } = new URL(request.url);
    const requestedVersionId = searchParams.get("versionId");
    const { data: isSuperAdmin } = await supabase.rpc("get_user_super_admin_status", {
      user_id: user.id,
    });

    if (!isSuperAdmin && !currentOrgId) {
      return NextResponse.json({ error: "No organization context found" }, { status: 400 });
    }

    // Prices editor is always scoped to currently selected organization context.
    // This avoids mixing multiple orgs/versions in the same UI.
    let orgId = currentOrgId;
    const pricing: Record<string, unknown[]> = {};
    const errors: Record<string, string> = {};
    let adminKeyInvalid = false;
    let fallbackReason: string | null = null;
    let activePricingVersionId: string | null = null;
    let availableVersions: Array<{
      id: string;
      version_name: string;
      version_number: number;
      is_active: boolean;
      is_published: boolean;
      created_at: string | null;
    }> = [];

    console.log("[pricing][GET] start", {
      user_id: user.id,
      is_super_admin: Boolean(isSuperAdmin),
      current_org_id: currentOrgId,
      admin_client_present: Boolean(admin),
      initial_org_scope: orgId,
    });

    // To avoid duplicate rows in UI, show only the currently active pricing version when scoped to one org.
    if (orgId) {
      const versionDb = admin ?? supabase;
      let versionQuery = versionDb
        .from("pricing_versions")
        .select("id, version_name, version_number, is_active, is_published, created_at")
        .eq("organization_id", orgId)
        .order("version_number", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(100);

      let { data: versionRows, error: versionError } = await versionQuery;
      if (
        versionError &&
        admin &&
        (versionError.message?.toLowerCase().includes("invalid api key") ||
          versionError.message?.toLowerCase().includes("invalid apikey"))
      ) {
        adminKeyInvalid = true;
        fallbackReason = versionError.message || "invalid api key";
        console.warn("[pricing][GET] admin key invalid while loading active version, switching to fallback", {
          reason: fallbackReason,
          fallback_org_scope: orgId,
        });
        const fallbackVersion = await supabase
          .from("pricing_versions")
          .select("id, version_name, version_number, is_active, is_published, created_at")
          .eq("organization_id", orgId)
          .order("version_number", { ascending: false })
          .order("created_at", { ascending: false })
          .limit(100);
        versionRows = fallbackVersion.data;
        versionError = fallbackVersion.error;
      }

      if (!versionError && versionRows && versionRows.length > 0) {
        availableVersions = versionRows as typeof availableVersions;
        const activeVersion = availableVersions.find((v) => v.is_active);
        activePricingVersionId = requestedVersionId || activeVersion?.id || availableVersions[0].id;
      }
    }

    for (const table of ALLOWED_TABLES) {
      const db = admin && !adminKeyInvalid ? admin : supabase;
      let query = db.from(table).select("*");

      if (orgId && !GLOBAL_TABLES.has(table)) {
        query = query.eq("organization_id", orgId);
      }
      if (activePricingVersionId && VERSIONED_TABLES.has(table)) {
        query = query.eq("pricing_version_id", activePricingVersionId);
      }

      let { data, error } = await query;

      // If admin key is invalid, fallback to session client and org-scoped reads.
      if (
        error &&
        admin &&
        !adminKeyInvalid &&
        (error.message?.toLowerCase().includes("invalid api key") ||
          error.message?.toLowerCase().includes("invalid apikey"))
      ) {
        adminKeyInvalid = true;
        fallbackReason = error.message || "invalid api key";
        orgId = currentOrgId;
        console.warn("[pricing][GET] admin key invalid, switching to fallback", {
          table,
          reason: fallbackReason,
          fallback_org_scope: orgId,
        });
          let fallbackQuery = supabase.from(table).select("*");
        if (orgId && !GLOBAL_TABLES.has(table)) {
          fallbackQuery = fallbackQuery.eq("organization_id", orgId);
        }
        if (activePricingVersionId && VERSIONED_TABLES.has(table)) {
          fallbackQuery = fallbackQuery.eq("pricing_version_id", activePricingVersionId);
        }
        const fallback = await fallbackQuery;
        data = fallback.data;
        error = fallback.error;
      }

      if (error) {
        console.error(`Pricing GET failed for ${table}`, error);
        errors[table] = error.message;
        pricing[table] = [];
        continue;
      }

      pricing[table] = data || [];
      console.log("[pricing][GET] table loaded", {
        table,
        rows: pricing[table].length,
        scoped_org_id: orgId,
        using_admin_client: Boolean(admin && !adminKeyInvalid),
      });
    }

    console.log("[pricing][GET] done", {
      organization_id: orgId,
      admin_mode: Boolean(admin && !adminKeyInvalid),
      admin_key_invalid: adminKeyInvalid,
      fallback_reason: fallbackReason,
    });

    return NextResponse.json({
      pricing,
      errors,
      tables: ALLOWED_TABLES,
      organization_id: orgId,
      is_super_admin: Boolean(isSuperAdmin),
      admin_mode: Boolean(admin && !adminKeyInvalid),
      admin_key_invalid: adminKeyInvalid,
      fallback_reason: fallbackReason,
      active_pricing_version_id: activePricingVersionId,
      available_versions: availableVersions,
    });
  } catch (error) {
    console.error("Error in pricing GET:", error);
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

    const body = await request.json();
    const table = String(body?.table || "");
    const id = String(body?.id || "");
    const updates = body?.updates;

    if (!isAllowedTable(table)) {
      return NextResponse.json({ error: "Invalid pricing table" }, { status: 400 });
    }
    if (!id || !updates || typeof updates !== "object" || Array.isArray(updates)) {
      return NextResponse.json({ error: "Invalid update payload" }, { status: 400 });
    }

    const updatePayload = pickUpdates(updates as Record<string, unknown>);
    if (Object.keys(updatePayload).length === 0) {
      return NextResponse.json({ error: "No editable fields in update" }, { status: 400 });
    }

    let db = admin ?? supabase;

    const selectCols = GLOBAL_NO_ORG_TABLES.has(table) ? "id" : "id, organization_id";

    let { data: existing, error: readError } = await db
      .from(table)
      .select(selectCols)
      .eq("id", id)
      .single();

    if (
      readError &&
      admin &&
      (readError.message?.toLowerCase().includes("invalid api key") ||
        readError.message?.toLowerCase().includes("invalid apikey"))
    ) {
      db = supabase;
      const retry = await db.from(table).select(selectCols).eq("id", id).single();
      existing = retry.data;
      readError = retry.error;
    }

    if (readError || !existing) {
      return NextResponse.json({ error: "Pricing row not found" }, { status: 404 });
    }

    const currentOrgId = await getCurrentOrg(supabase, user.id);
    const { data: isSuperAdmin } = await supabase.rpc("get_user_super_admin_status", {
      user_id: user.id,
    });
    const canManage = await canManagePricing(supabase, user.id, Boolean(isSuperAdmin));

    if (!canManage) {
      return NextResponse.json({ error: "Forbidden – pricing admin only" }, { status: 403 });
    }
    const existingOrgId = (existing as { organization_id?: string }).organization_id;
    if (!GLOBAL_NO_ORG_TABLES.has(table) && !isSuperAdmin && existingOrgId !== currentOrgId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (table === "pricing_vehicle_rates") {
      updatePayload.updated_at = new Date().toISOString();
    }

    const writeClient = writeDb(admin, table) ?? (GLOBAL_TABLES.has(table) ? null : supabase);
    if (!writeClient) {
      return NextResponse.json(
        {
          error:
            "Server missing SUPABASE_SERVICE_ROLE_KEY — cannot save global pricing tables. Add the key in admin env.",
        },
        { status: 503 }
      );
    }

    let { data, error } = await writeClient
      .from(table)
      .update(updatePayload)
      .eq("id", id)
      .select("*")
      .single();

    if (
      error &&
      writeClient === admin &&
      admin &&
      (error.message?.toLowerCase().includes("invalid api key") ||
        error.message?.toLowerCase().includes("invalid apikey"))
    ) {
      const retry = await supabase
        .from(table)
        .update(updatePayload)
        .eq("id", id)
        .select("*")
        .single();
      data = retry.data;
      error = retry.error;
    }

    if (error) {
      console.error("Pricing update failed:", error);
      return NextResponse.json(
        { error: error.message || "Failed to update pricing row" },
        { status: 500 }
      );
    }

    return NextResponse.json({ row: data });
  } catch (error) {
    console.error("Error in pricing PATCH:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
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

    const { data: isSuperAdmin } = await supabase.rpc("get_user_super_admin_status", {
      user_id: user.id,
    });
    const canManage = await canManagePricing(supabase, user.id, Boolean(isSuperAdmin));
    if (!canManage) {
      return NextResponse.json({ error: "Forbidden – pricing admin only" }, { status: 403 });
    }

    const body = await request.json();
    const table = String(body?.table || "");
    const row = (body?.row && typeof body.row === "object" ? body.row : {}) as Record<string, unknown>;

    if (!CREATABLE_TABLES.has(table)) {
      return NextResponse.json({ error: "Table does not support create" }, { status: 400 });
    }

    if (GLOBAL_TABLES.has(table) && !admin) {
      return NextResponse.json(
        {
          error:
            "Server missing SUPABASE_SERVICE_ROLE_KEY — cannot create rows. Add the key in admin env.",
        },
        { status: 503 }
      );
    }

    let db = admin ?? supabase;
    let insertPayload: Record<string, unknown> = {};

    if (table === "payout_escalation_tiers") {
      let versionId = String(body?.pricing_version_id || "");
      if (!versionId) {
        const { data: activeVersion } = await db
          .from("pricing_versions")
          .select("id")
          .eq("is_active", true)
          .maybeSingle();
        versionId = activeVersion?.id ?? "";
      }
      if (!versionId) {
        return NextResponse.json({ error: "No active pricing version" }, { status: 400 });
      }
      const tierGroup =
        row.tier_group === "duration" || row.tier_group === "trip"
          ? row.tier_group
          : "trip";
      const vehicleCategoryId =
        typeof row.vehicle_category_id === "string" && row.vehicle_category_id.trim()
          ? row.vehicle_category_id.trim()
          : "executive";
      insertPayload = {
        pricing_version_id: versionId,
        tier_group: tierGroup,
        vehicle_category_id: vehicleCategoryId,
        label: row.label ?? "New tier",
        min_hours_before_job: row.min_hours_before_job ?? 0,
        max_hours_before_job: row.max_hours_before_job ?? null,
        driver_payout_factor: row.driver_payout_factor ?? 0.5,
        sort_order: row.sort_order ?? 0,
        is_active: row.is_active ?? true,
      };
    } else if (table === "service_suppliers") {
      const serviceItemId = String(row.service_item_id || "flowers-standard");
      if (row.is_default === true) {
        await db
          .from("service_suppliers")
          .update({ is_default: false })
          .eq("service_item_id", serviceItemId);
      }
      insertPayload = {
        service_item_id: serviceItemId,
        name: row.name ?? "New supplier",
        address: row.address ?? null,
        phone: row.phone ?? null,
        pickup_instructions: row.pickup_instructions ?? null,
        is_default: row.is_default ?? false,
        is_active: row.is_active ?? true,
      };
    } else if (table === "service_item_payout_rules") {
      const currentOrgId = await getCurrentOrg(supabase, user.id);
      if (!currentOrgId) {
        return NextResponse.json({ error: "No organization context" }, { status: 400 });
      }
      insertPayload = {
        organization_id: currentOrgId,
        service_item_id: row.service_item_id ?? "flowers-standard",
        recipient_type: "driver",
        payout_mode: row.payout_mode ?? "fixed",
        payout_value: row.payout_value ?? 2000,
        currency: row.currency ?? "GBP",
        is_active: row.is_active ?? true,
      };
    }

    let { data, error } = await db.from(table).insert(insertPayload).select("*").single();

    if (
      error &&
      admin &&
      (error.message?.toLowerCase().includes("invalid api key") ||
        error.message?.toLowerCase().includes("invalid apikey"))
    ) {
      const retry = await supabase.from(table).insert(insertPayload).select("*").single();
      data = retry.data;
      error = retry.error;
    }

    if (error) {
      console.error("Pricing create failed:", error);
      return NextResponse.json({ error: error.message || "Failed to create row" }, { status: 500 });
    }

    return NextResponse.json({ row: data });
  } catch (error) {
    console.error("Error in pricing POST:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
