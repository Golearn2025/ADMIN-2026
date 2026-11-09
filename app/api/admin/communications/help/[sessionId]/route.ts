/**
 * GET  /api/admin/communications/help/:sessionId — session + messages
 * POST /api/admin/communications/help/:sessionId — operator reply
 * SSOT: admin_driver_help_sessions_v1 + live_chat_messages
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentOrg } from "@/lib/auth/org";
import type { HelpMessageRow, HelpSessionRow } from "@/lib/features/communications";

type Ctx = { params: Promise<{ sessionId: string }> };

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
      .select(
        "id, session_id, driver_id, sender_id, sender_type, message, message_type, image_url, created_at, read_at"
      )
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true })
      .limit(500);

    if (messagesError) {
      return NextResponse.json({ error: messagesError.message }, { status: 500 });
    }

    // Only when operator explicitly opens a thread — never on realtime refresh
    if (markRead) {
      await admin
        .from("live_chat_messages")
        .update({ read_at: new Date().toISOString() })
        .eq("session_id", sessionId)
        .eq("sender_type", "driver")
        .is("read_at", null);
    }

    return NextResponse.json({
      session: {
        ...(session as HelpSessionRow),
        unread_count: markRead ? 0 : (session as HelpSessionRow).unread_count,
      },
      messages: (messages || []) as HelpMessageRow[],
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

    const body = (await req.json()) as { message?: string };
    const message = (body.message || "").trim();
    if (!message) {
      return NextResponse.json({ error: "message is required" }, { status: 400 });
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

    const { data: inserted, error: insertError } = await admin
      .from("live_chat_messages")
      .insert({
        session_id: sessionId,
        driver_id: session.driver_id,
        sender_id: user.id,
        sender_type: "operator",
        message,
        message_type: "text",
      })
      .select(
        "id, session_id, driver_id, sender_id, sender_type, message, message_type, image_url, created_at, read_at"
      )
      .single();

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    await admin
      .from("live_chat_sessions")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", sessionId);

    return NextResponse.json({ message: inserted as HelpMessageRow });
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
