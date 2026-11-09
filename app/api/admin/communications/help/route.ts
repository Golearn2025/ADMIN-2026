/**
 * GET /api/admin/communications/help
 * SSOT: admin_driver_help_sessions_v1 — search + pagination (max 20)
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentOrg } from "@/lib/auth/org";
import type { HelpSessionRow } from "@/lib/features/communications";

export async function GET(req: NextRequest) {
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

    const status = req.nextUrl.searchParams.get("status") || "all";
    const q = (req.nextUrl.searchParams.get("q") || "").trim();
    const page = Math.max(1, Number(req.nextUrl.searchParams.get("page") || 1));
    const pageSize = Math.min(
      Math.max(5, Number(req.nextUrl.searchParams.get("pageSize") || 20)),
      20
    );
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = admin
      .from("admin_driver_help_sessions_v1")
      .select("*", { count: "exact" })
      .eq("organization_id", orgId)
      .order("updated_at", { ascending: false })
      .range(from, to);

    if (status !== "all") {
      query = query.eq("status", status);
    }

    if (q) {
      const escaped = q.replace(/%/g, "\\%").replace(/_/g, "\\_");
      query = query.or(
        `driver_name.ilike.%${escaped}%,driver_email.ilike.%${escaped}%,topic.ilike.%${escaped}%,last_message_preview.ilike.%${escaped}%`
      );
    }

    const { data, error, count } = await query;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const [{ count: activeCount }, { count: closedCount }, { count: totalCount }] =
      await Promise.all([
        admin
          .from("admin_driver_help_sessions_v1")
          .select("id", { count: "exact", head: true })
          .eq("organization_id", orgId)
          .eq("status", "active"),
        admin
          .from("admin_driver_help_sessions_v1")
          .select("id", { count: "exact", head: true })
          .eq("organization_id", orgId)
          .eq("status", "closed"),
        admin
          .from("admin_driver_help_sessions_v1")
          .select("id", { count: "exact", head: true })
          .eq("organization_id", orgId),
      ]);

    return NextResponse.json({
      rows: (data || []) as HelpSessionRow[],
      page,
      pageSize,
      total: count ?? 0,
      summary: {
        total: totalCount ?? 0,
        active: activeCount ?? 0,
        closed: closedCount ?? 0,
      },
    });
  } catch (err) {
    console.error("[communications/help GET]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
