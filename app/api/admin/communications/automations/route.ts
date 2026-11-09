/**
 * GET/PATCH /api/admin/communications/automations
 * SSOT: notification_automation_rules + admin_doc_expiry_candidates_v1
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentOrg } from "@/lib/auth/org";
import type {
  AutomationRule,
  DocExpiryCandidate,
} from "@/lib/features/communications";

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

    const [rulesRes, candidatesRes] = await Promise.all([
      admin
        .from("notification_automation_rules")
        .select("*")
        .eq("organization_id", orgId)
        .order("category", { ascending: true })
        .order("title", { ascending: true }),
      admin
        .from("admin_doc_expiry_candidates_v1")
        .select("*")
        .eq("organization_id", orgId)
        .order("days_until_expiry", { ascending: true })
        .limit(100),
    ]);

    if (rulesRes.error) {
      return NextResponse.json({ error: rulesRes.error.message }, { status: 500 });
    }
    if (candidatesRes.error) {
      return NextResponse.json({ error: candidatesRes.error.message }, { status: 500 });
    }

    return NextResponse.json({
      rules: (rulesRes.data || []) as AutomationRule[],
      docExpiryCandidates: (candidatesRes.data || []) as DocExpiryCandidate[],
    });
  } catch (err) {
    console.error("[communications/automations GET]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
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

    const body = (await req.json()) as {
      id?: string;
      enabled?: boolean;
      config?: Record<string, unknown>;
    };

    if (!body.id || typeof body.enabled !== "boolean") {
      return NextResponse.json(
        { error: "id and enabled are required" },
        { status: 400 }
      );
    }

    const patch: Record<string, unknown> = {
      enabled: body.enabled,
      updated_at: new Date().toISOString(),
    };
    if (body.config && typeof body.config === "object") {
      patch.config = body.config;
    }

    const { data, error } = await admin
      .from("notification_automation_rules")
      .update(patch)
      .eq("id", body.id)
      .eq("organization_id", orgId)
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ rule: data as AutomationRule });
  } catch (err) {
    console.error("[communications/automations PATCH]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
