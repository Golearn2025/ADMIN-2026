"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * Bidirectional typing for admin Messages.
 * Writes user_type=operator; listens for driver rows on same session.
 */
export function useHelpTyping(sessionId: string | null) {
  const [driverTyping, setDriverTyping] = useState(false);
  const [authUserId, setAuthUserId] = useState<string | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const supabase = createClient();
    void supabase.auth.getUser().then(({ data }) => {
      setAuthUserId(data.user?.id ?? null);
    });
  }, []);

  useEffect(() => {
    setDriverTyping(false);
    if (!sessionId) return;

    const supabase = createClient();
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let cancelled = false;

    const start = async () => {
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      if (!data.session) {
        const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
          if (session) {
            sub.subscription.unsubscribe();
            void start();
          }
        });
        return;
      }

      channel = supabase
        .channel(`admin_typing:${sessionId}:${Date.now()}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "chat_typing_indicator",
            filter: `session_id=eq.${sessionId}`,
          },
          (payload) => {
            const row = payload.new as {
              user_type?: string;
              is_typing?: boolean;
            } | null;
            if (!row) return;
            if (row.user_type !== "driver") return;

            setDriverTyping(Boolean(row.is_typing));
            if (clearTimerRef.current) clearTimeout(clearTimerRef.current);
            if (row.is_typing) {
              // Safety: hide if no refresh within 5s
              clearTimerRef.current = setTimeout(() => {
                setDriverTyping(false);
              }, 5000);
            }
          }
        )
        .subscribe();
    };

    void start();

    return () => {
      cancelled = true;
      if (clearTimerRef.current) clearTimeout(clearTimerRef.current);
      if (channel) void supabase.removeChannel(channel);
    };
  }, [sessionId]);

  const setTyping = useCallback(
    async (isTyping: boolean) => {
      if (!sessionId || !authUserId) return;
      const supabase = createClient();
      await supabase.from("chat_typing_indicator").upsert(
        {
          session_id: sessionId,
          user_id: authUserId,
          user_type: "operator",
          is_typing: isTyping,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "session_id,user_id" }
      );
    },
    [sessionId, authUserId]
  );

  const notifyTyping = useCallback(() => {
    if (!sessionId || !authUserId) return;
    void setTyping(true);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      void setTyping(false);
    }, 3000);
  }, [sessionId, authUserId, setTyping]);

  const stopTyping = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    void setTyping(false);
  }, [setTyping]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (sessionId && authUserId) {
        const supabase = createClient();
        void supabase.from("chat_typing_indicator").upsert(
          {
            session_id: sessionId,
            user_id: authUserId,
            user_type: "operator",
            is_typing: false,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "session_id,user_id" }
        );
      }
    };
  }, [sessionId, authUserId]);

  return { driverTyping, notifyTyping, stopTyping };
}
