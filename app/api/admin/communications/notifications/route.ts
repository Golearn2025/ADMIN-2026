/**
 * GET /api/admin/communications/notifications
 * SSOT history: admin_communications_send_history_v1
 * All driver-related notification_events (jobs, admin, docs…) + delivery status.
 * Tabs: All / Updates / Documents (jobs land under Updates for now).
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentOrg } from "@/lib/auth/org";
import type {
  CommunicationsSendHistoryRow,
  InboxSection,
} from "@/lib/features/communications";

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

    const section = req.nextUrl.searchParams.get("section") as
      | InboxSection
      | "all"
      | null;
    const q = (req.nextUrl.searchParams.get("q") || "").trim();
    const page = Math.max(1, Number(req.nextUrl.searchParams.get("page") || 1));
    const pageSize = Math.min(
      Math.max(5, Number(req.nextUrl.searchParams.get("pageSize") || 20)),
      50
    );
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = admin
      .from("admin_communications_send_history_v1")
      .select("*", { count: "exact" })
      .eq("organization_id", orgId)
      .order("created_at", { ascending: false })
      .range(from, to);

    if (section && section !== "all") {
      query = query.eq("section", section);
    }

    if (q) {
      const escaped = q.replace(/%/g, "\\%").replace(/_/g, "\\_");
      query = query.or(
        `title.ilike.%${escaped}%,body.ilike.%${escaped}%,driver_name.ilike.%${escaped}%,driver_email.ilike.%${escaped}%,inbox_type.ilike.%${escaped}%,status.ilike.%${escaped}%`
      );
    }

    const { data, error, count } = await query;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const { data: summaryRows, error: summaryError } = await admin
      .from("admin_communications_send_history_v1")
      .select("section")
      .eq("organization_id", orgId);

    if (summaryError) {
      return NextResponse.json({ error: summaryError.message }, { status: 500 });
    }

    const sections = (summaryRows || []).map((r) => r.section as string);
    const rows = (data || []) as CommunicationsSendHistoryRow[];

    return NextResponse.json({
      rows,
      page,
      pageSize,
      total: count ?? rows.length,
      summary: {
        total: sections.length,
        updates: sections.filter((s) => s === "updates").length,
        documents: sections.filter((s) => s === "documents").length,
      },
    });
  } catch (err) {
    console.error("[communications/notifications GET]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
