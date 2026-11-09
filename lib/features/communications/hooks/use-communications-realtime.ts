"use client";

import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * Realtime for Communications.
 * Views are not realtime — listen to base tables, then refetch SSOT via API.
 */
export function useCommunicationsNotificationsRealtime(onChange: () => void) {
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    const supabase = createClient();
    let timer: ReturnType<typeof setTimeout> | null = null;

    const schedule = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => onChangeRef.current(), 400);
    };

    const channel = supabase
      .channel(`admin_communications_notifications:${Date.now()}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notification_events" },
        schedule
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications" },
        schedule
      )
      .subscribe();

    return () => {
      if (timer) clearTimeout(timer);
      void supabase.removeChannel(channel);
    };
  }, []);
}

export function useCommunicationsHelpRealtime(
  selectedSessionId: string | null,
  onInboxChange: () => void,
  onMessagesChange: () => void
) {
  const inboxRef = useRef(onInboxChange);
  const messagesRef = useRef(onMessagesChange);
  const selectedRef = useRef(selectedSessionId);
  inboxRef.current = onInboxChange;
  messagesRef.current = onMessagesChange;
  selectedRef.current = selectedSessionId;

  useEffect(() => {
    const supabase = createClient();
    let inboxTimer: ReturnType<typeof setTimeout> | null = null;
    let messagesTimer: ReturnType<typeof setTimeout> | null = null;

    const scheduleInbox = () => {
      if (inboxTimer) clearTimeout(inboxTimer);
      inboxTimer = setTimeout(() => inboxRef.current(), 400);
    };
    const scheduleMessages = () => {
      if (messagesTimer) clearTimeout(messagesTimer);
      messagesTimer = setTimeout(() => messagesRef.current(), 400);
    };

    const channel = supabase
      .channel(`admin_communications_help:${Date.now()}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "live_chat_sessions" },
        scheduleInbox
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "live_chat_messages" },
        (payload) => {
          scheduleInbox();
          const row = payload.new as { session_id?: string };
          if (selectedRef.current && row.session_id === selectedRef.current) {
            scheduleMessages();
          }
        }
      )
      .subscribe();

    return () => {
      if (inboxTimer) clearTimeout(inboxTimer);
      if (messagesTimer) clearTimeout(messagesTimer);
      void supabase.removeChannel(channel);
    };
  }, []);
}
