/**
 * GET  /api/admin/communications/help — list sessions
 * POST /api/admin/communications/help — compose new message to a driver
 *      (reuse active session or create one; always notify on brand-new thread)
 * SSOT: admin_driver_help_sessions_v1 + live_chat_sessions / live_chat_messages
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentOrg } from "@/lib/auth/org";
import type { HelpSessionRow } from "@/lib/features/communications";
import { notifyAfterOperatorMessage } from "@/lib/features/communications/server/notify-driver-chat";

const LIST_COLUMNS = [
  "id",
  "organization_id",
  "driver_id",
  "driver_name",
  "driver_email",
  "driver_phone",
  "topic",
  "status",
  "started_at",
  "closed_at",
  "updated_at",
  "message_count",
  "unread_count",
  "last_message_preview",
  "last_sender_type",
].join(",");

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
      .select(LIST_COLUMNS, { count: "exact" })
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

    // Summary counts hit base table (indexed) — not the view 3x
    const [listResult, activeHead, closedHead, totalHead] = await Promise.all([
      query,
      admin
        .from("live_chat_sessions")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", orgId)
        .eq("status", "active"),
      admin
        .from("live_chat_sessions")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", orgId)
        .eq("status", "closed"),
      admin
        .from("live_chat_sessions")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", orgId),
    ]);

    if (listResult.error) {
      return NextResponse.json({ error: listResult.error.message }, { status: 500 });
    }

    return NextResponse.json({
      rows: (listResult.data || []) as unknown as HelpSessionRow[],
      page,
      pageSize,
      total: listResult.count ?? 0,
      summary: {
        total: totalHead.count ?? 0,
        active: activeHead.count ?? 0,
        closed: closedHead.count ?? 0,
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

function displayNameFromAuthUser(user: {
  email?: string | null;
  user_metadata?: Record<string, unknown>;
}): string {
  const meta = user.user_metadata || {};
  const candidates = [
    meta.full_name,
    meta.name,
    meta.display_name,
    [meta.first_name, meta.last_name].filter(Boolean).join(" ").trim(),
  ];
  for (const c of candidates) {
    if (typeof c === "string" && c.trim()) return c.trim();
  }
  const email = user.email || "";
  if (email.includes("@")) return email.split("@")[0] || "Support";
  return "Support";
}

/**
 * Compose: pick a driver + message → open/reuse active help session + notify.
 */
export async function POST(req: NextRequest) {
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
      driverId?: string;
      message?: string;
      topic?: string;
    };
    const driverId = (body.driverId || "").trim();
    const message = (body.message || "").trim();
    const topic = (body.topic || "").trim() || "Message from Support";

    if (!driverId) {
      return NextResponse.json({ error: "driverId is required" }, { status: 400 });
    }
    if (!message) {
      return NextResponse.json({ error: "message is required" }, { status: 400 });
    }

    const { data: driver, error: driverError } = await admin
      .from("admin_drivers_list_v4")
      .select("id")
      .eq("organization_id", orgId)
      .eq("id", driverId)
      .eq("is_active", true)
      .maybeSingle();

    if (driverError) {
      return NextResponse.json({ error: driverError.message }, { status: 500 });
    }
    if (!driver?.id) {
      return NextResponse.json(
        { error: "Driver not found or inactive in organization" },
        { status: 400 }
      );
    }

    // Prefer an existing open thread for this driver (one active conversation)
    const { data: existingRows, error: existingError } = await admin
      .from("live_chat_sessions")
      .select("id, status")
      .eq("organization_id", orgId)
      .eq("driver_id", driverId)
      .eq("status", "active")
      .order("updated_at", { ascending: false })
      .limit(1);

    if (existingError) {
      return NextResponse.json({ error: existingError.message }, { status: 500 });
    }

    let sessionId = existingRows?.[0]?.id as string | undefined;
    let created = false;

    if (!sessionId) {
      const { data: createdSession, error: createError } = await admin
        .from("live_chat_sessions")
        .insert({
          organization_id: orgId,
          driver_id: driverId,
          topic,
          status: "active",
        })
        .select("id")
        .single();

      if (createError) {
        return NextResponse.json({ error: createError.message }, { status: 500 });
      }
      sessionId = createdSession.id as string;
      created = true;
    }

    const operatorName = displayNameFromAuthUser(user);
    const { data: inserted, error: insertError } = await admin
      .from("live_chat_messages")
      .insert({
        session_id: sessionId,
        driver_id: driverId,
        sender_id: user.id,
        sender_type: "operator",
        sender_display_name: operatorName,
        message,
        message_type: "text",
        image_url: null,
      })
      .select(
        "id, session_id, driver_id, sender_id, sender_type, sender_display_name, message, message_type, image_url, created_at, read_at"
      )
      .single();

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    await admin
      .from("live_chat_sessions")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", sessionId);

    // New thread → always notify; reuse existing → debounce like reply
    const notify = await notifyAfterOperatorMessage({
      admin,
      organizationId: orgId,
      driverId,
      sessionId,
      actorId: user.id,
      messageId: inserted.id as string,
      preview: message,
      force: created,
    });

    return NextResponse.json({
      sessionId,
      created,
      message: inserted,
      notified: notify.notified,
      notifySkipped: notify.skipped ?? null,
    });
  } catch (err) {
    console.error("[communications/help POST]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
