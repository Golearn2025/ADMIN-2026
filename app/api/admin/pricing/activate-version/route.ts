import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrg } from "@/lib/auth/org";
import { canManagePricing } from "@/lib/auth/pricing-access";
import { createAdminClient } from "@/lib/supabase/admin";

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

    const body = await request.json();
    const versionId = String(body?.version_id || "").trim();
    if (!versionId) {
      return NextResponse.json({ error: "version_id is required" }, { status: 400 });
    }

    const { data: isSuperAdmin } = await supabase.rpc("get_user_super_admin_status", {
      user_id: user.id,
    });
    const canManage = await canManagePricing(supabase, user.id, Boolean(isSuperAdmin));
    if (!canManage) {
      return NextResponse.json({ error: "Forbidden – pricing admin only" }, { status: 403 });
    }

    const currentOrgId = await getCurrentOrg(supabase, user.id);
    let db = admin ?? supabase;

    let { data: target, error: targetError } = await db
      .from("pricing_versions")
      .select("id, organization_id, version_name, version_number, is_active, is_published")
      .eq("id", versionId)
      .maybeSingle();

    if (
      targetError &&
      admin &&
      (targetError.message?.toLowerCase().includes("invalid api key") ||
        targetError.message?.toLowerCase().includes("invalid apikey"))
    ) {
      db = supabase;
      const retry = await db
        .from("pricing_versions")
        .select("id, organization_id, version_name, version_number, is_active, is_published")
        .eq("id", versionId)
        .maybeSingle();
      target = retry.data;
      targetError = retry.error;
    }

    if (targetError || !target) {
      return NextResponse.json({ error: "Pricing version not found" }, { status: 404 });
    }

    if (!isSuperAdmin && currentOrgId && target.organization_id !== currentOrgId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (target.is_active) {
      return NextResponse.json({
        ok: true,
        already_active: true,
        version: target,
      });
    }

    if (!target.is_published) {
      return NextResponse.json(
        {
          error:
            "Versiunea trebuie publicată (Published = ON) înainte de activare. Editează în tab Versions.",
        },
        { status: 400 }
      );
    }

    const writeClient = admin ?? supabase;

    const { error: deactivateError } = await writeClient
      .from("pricing_versions")
      .update({ is_active: false })
      .eq("organization_id", target.organization_id)
      .eq("is_active", true);

    if (deactivateError) {
      console.error("[pricing][activate-version] deactivate failed", deactivateError);
      return NextResponse.json(
        { error: deactivateError.message || "Failed to deactivate current version" },
        { status: 500 }
      );
    }

    const { data: activated, error: activateError } = await writeClient
      .from("pricing_versions")
      .update({ is_active: true })
      .eq("id", target.id)
      .select("id, version_name, version_number, is_active, is_published")
      .single();

    if (activateError) {
      console.error("[pricing][activate-version] activate failed", activateError);
      return NextResponse.json(
        { error: activateError.message || "Failed to activate pricing version" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      version: activated,
    });
  } catch (error) {
    console.error("Error in pricing activate-version POST:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
