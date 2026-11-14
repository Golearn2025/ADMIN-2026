/**
 * GET  /api/admin/communications/help/:sessionId — session + messages
 * POST /api/admin/communications/help/:sessionId — operator reply (text and/or image)
 * SSOT: admin_driver_help_sessions_v1 + live_chat_messages
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentOrg } from "@/lib/auth/org";
import type { HelpMessageRow, HelpSessionRow } from "@/lib/features/communications";
import { notifyAfterOperatorMessage } from "@/lib/features/communications/server/notify-driver-chat";

type Ctx = { params: Promise<{ sessionId: string }> };

const MESSAGE_COLUMNS =
  "id, session_id, driver_id, sender_id, sender_type, sender_display_name, message, message_type, image_url, created_at, read_at";

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

function withFallbackNames(
  rows: HelpMessageRow[],
  driverName: string | null | undefined
): HelpMessageRow[] {
  return rows.map((m) => {
    if (m.sender_display_name?.trim()) return m;
    const fromDriver = m.sender_type === "driver";
    return {
      ...m,
      sender_display_name: fromDriver
        ? driverName?.trim() || "Driver"
        : "Support",
    };
  });
}

export async function GET(req: NextRequest, ctx: Ctx) {
  try {
    const { sessionId } = await ctx.params;
    const markRead = req.nextUrl.searchParams.get("markRead") === "1";
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

    const { data: session, error: sessionError } = await admin
      .from("admin_driver_help_sessions_v1")
      .select("*")
      .eq("organization_id", orgId)
      .eq("id", sessionId)
      .maybeSingle();

    if (sessionError) {
      return NextResponse.json({ error: sessionError.message }, { status: 500 });
    }
    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    const { data: messages, error: messagesError } = await admin
      .from("live_chat_messages")
      .select(MESSAGE_COLUMNS)
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true })
      .limit(500);

    if (messagesError) {
      return NextResponse.json({ error: messagesError.message }, { status: 500 });
    }

    if (markRead) {
      await admin
        .from("live_chat_messages")
        .update({ read_at: new Date().toISOString() })
        .eq("session_id", sessionId)
        .eq("sender_type", "driver")
        .is("read_at", null);
      await admin.rpc("live_chat_sessions_recompute_unread", {
        p_session_id: sessionId,
      });
    }

    const sessionRow = session as HelpSessionRow;
    return NextResponse.json({
      session: {
        ...sessionRow,
        unread_count: markRead ? 0 : sessionRow.unread_count,
      },
      messages: withFallbackNames(
        (messages || []) as HelpMessageRow[],
        sessionRow.driver_name
      ),
    });
  } catch (err) {
    console.error("[communications/help/:id GET]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest, ctx: Ctx) {
  try {
    const { sessionId } = await ctx.params;
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

    const contentType = req.headers.get("content-type") || "";
    let message = "";
    let file: File | null = null;

    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      message = String(form.get("message") || "").trim();
      const raw = form.get("file");
      file = raw instanceof File && raw.size > 0 ? raw : null;
    } else {
      const body = (await req.json()) as { message?: string };
      message = (body.message || "").trim();
    }

    if (!message && !file) {
      return NextResponse.json(
        { error: "message or image is required" },
        { status: 400 }
      );
    }

    const { data: session, error: sessionError } = await admin
      .from("live_chat_sessions")
      .select("id, organization_id, driver_id, status")
      .eq("id", sessionId)
      .eq("organization_id", orgId)
      .maybeSingle();

    if (sessionError) {
      return NextResponse.json({ error: sessionError.message }, { status: 500 });
    }
    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }
    if (session.status === "closed") {
      return NextResponse.json({ error: "Session is closed" }, { status: 400 });
    }

    let imageUrl: string | null = null;
    if (file) {
      if (!file.type.startsWith("image/")) {
        return NextResponse.json({ error: "Only images allowed" }, { status: 400 });
      }
      if (file.size > 10 * 1024 * 1024) {
        return NextResponse.json({ error: "Image too large (max 10MB)" }, { status: 400 });
      }
      const ext =
        file.type === "image/png"
          ? "png"
          : file.type === "image/webp"
            ? "webp"
            : file.type === "image/gif"
              ? "gif"
              : "jpg";
      const path = `${session.driver_id}/admin-${Date.now()}.${ext}`;
      const bytes = new Uint8Array(await file.arrayBuffer());
      const { error: uploadError } = await admin.storage
        .from("chat-images")
        .upload(path, bytes, {
          contentType: file.type || "image/jpeg",
          upsert: false,
        });
      if (uploadError) {
        return NextResponse.json({ error: uploadError.message }, { status: 500 });
      }
      const { data: pub } = admin.storage.from("chat-images").getPublicUrl(path);
      imageUrl = pub.publicUrl;
    }

    const operatorName = displayNameFromAuthUser(user);
    const { data: inserted, error: insertError } = await admin
      .from("live_chat_messages")
      .insert({
        session_id: sessionId,
        driver_id: session.driver_id,
        sender_id: user.id,
        sender_type: "operator",
        sender_display_name: operatorName,
        message: message || (imageUrl ? "📷 Photo" : ""),
        message_type: imageUrl ? "image" : "text",
        image_url: imageUrl,
      })
      .select(MESSAGE_COLUMNS)
      .single();

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    await admin
      .from("live_chat_sessions")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", sessionId);

    const row = inserted as HelpMessageRow;
    const notify = await notifyAfterOperatorMessage({
      admin,
      organizationId: orgId,
      driverId: session.driver_id,
      sessionId,
      actorId: user.id,
      messageId: row.id,
      preview: row.message || (imageUrl ? "📷 Photo" : ""),
    });

    return NextResponse.json({
      message: row,
      notified: notify.notified,
      notifySkipped: notify.skipped ?? null,
    });
  } catch (err) {
    console.error("[communications/help/:id POST]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}

/** PATCH — close / reopen conversation (ticket) */
export async function PATCH(req: NextRequest, ctx: Ctx) {
  try {
    const { sessionId } = await ctx.params;
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

    const body = (await req.json()) as { status?: "active" | "closed" };
    if (body.status !== "active" && body.status !== "closed") {
      return NextResponse.json({ error: "status must be active|closed" }, { status: 400 });
    }

    const now = new Date().toISOString();
    const patch =
      body.status === "closed"
        ? { status: "closed", closed_at: now, updated_at: now }
        : { status: "active", closed_at: null, updated_at: now };

    const { data, error } = await admin
      .from("live_chat_sessions")
      .update(patch)
      .eq("id", sessionId)
      .eq("organization_id", orgId)
      .select("id, status, closed_at, updated_at")
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (!data) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    return NextResponse.json({ session: data });
  } catch (err) {
    console.error("[communications/help/:id PATCH]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
