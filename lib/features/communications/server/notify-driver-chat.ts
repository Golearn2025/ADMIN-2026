/**
 * Debounced push when admin/operator writes in live chat.
 * Industry pattern: at most one notify per session per quiet window
 * (coalesce rapid reply bursts — chat itself stays realtime).
 */
import type { SupabaseClient } from "@supabase/supabase-js";

export const CHAT_PUSH_DEBOUNCE_MS = 3 * 60 * 1000;

const TITLE = "New message from Support";

function previewBody(raw: string): string {
  const t = raw.trim() || "Open Messages in the app";
  return t.length > 140 ? `${t.slice(0, 137)}…` : t;
}

/** True when we should enqueue a push for this operator message. */
export async function shouldNotifyDriverChatPush(
  admin: SupabaseClient,
  sessionId: string,
  excludeMessageId: string,
  debounceMs: number = CHAT_PUSH_DEBOUNCE_MS
): Promise<boolean> {
  const since = new Date(Date.now() - debounceMs).toISOString();
  const { count, error } = await admin
    .from("live_chat_messages")
    .select("id", { count: "exact", head: true })
    .eq("session_id", sessionId)
    .in("sender_type", ["operator", "admin"])
    .neq("id", excludeMessageId)
    .gte("created_at", since);

  if (error) {
    console.warn("[notify-driver-chat] debounce check failed:", error.message);
    // Fail open: still notify once rather than silent drop
    return true;
  }
  return (count ?? 0) === 0;
}

/**
 * After an operator message insert: enqueue inbox+push via
 * admin_enqueue_driver_notification, unless another operator message
 * landed in this session within the debounce window.
 * Never throws — chat send must succeed even if notify fails.
 */
export async function notifyAfterOperatorMessage(args: {
  admin: SupabaseClient;
  organizationId: string;
  driverId: string;
  sessionId: string;
  actorId: string;
  messageId: string;
  preview: string;
  /** Skip debounce (new admin-started conversation). */
  force?: boolean;
}): Promise<{ notified: boolean; skipped?: string; eventId?: string }> {
  const {
    admin,
    organizationId,
    driverId,
    sessionId,
    actorId,
    messageId,
    force = false,
  } = args;
  const body = previewBody(args.preview);

  try {
    if (!force) {
      const allow = await shouldNotifyDriverChatPush(
        admin,
        sessionId,
        messageId
      );
      if (!allow) {
        return { notified: false, skipped: "debounce" };
      }
    }

    const { data: eventId, error } = await admin.rpc(
      "admin_enqueue_driver_notification",
      {
        p_organization_id: organizationId,
        p_driver_id: driverId,
        p_type: "admin_message",
        p_title: TITLE,
        p_body: body,
        p_actor_id: actorId,
      }
    );

    if (error) {
      console.error("[notify-driver-chat] enqueue failed:", error.message);
      return { notified: false, skipped: error.message };
    }

    return { notified: true, eventId: eventId as string };
  } catch (err) {
    console.error("[notify-driver-chat]", err);
    return {
      notified: false,
      skipped: err instanceof Error ? err.message : "notify failed",
    };
  }
}
