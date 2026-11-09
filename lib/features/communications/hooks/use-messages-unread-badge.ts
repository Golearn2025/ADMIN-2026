"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { createClient } from "@/lib/supabase/client";

type Listener = () => void;

let unreadCount = 0;
let started = false;
let channel: ReturnType<ReturnType<typeof createClient>["channel"]> | null = null;
let pollTimer: ReturnType<typeof setTimeout> | null = null;
const listeners = new Set<Listener>();

function emit() {
  listeners.forEach((l) => l());
}

async function fetchUnread() {
  try {
    const res = await fetch("/api/admin/communications/messages/unread");
    const json = await res.json();
    if (res.ok) {
      unreadCount = Number(json.unread) || 0;
      emit();
    }
  } catch {
    // ignore badge errors
  }
}

function scheduleFetch() {
  if (pollTimer) clearTimeout(pollTimer);
  pollTimer = setTimeout(() => {
    void fetchUnread();
  }, 300);
}

function ensureSubscription() {
  if (started || typeof window === "undefined") return;
  started = true;

  void fetchUnread();

  const supabase = createClient();
  // Unique topic — never reuse a subscribed channel for extra .on()
  channel = supabase
    .channel(`admin_messages_unread_badge:${Date.now()}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "live_chat_messages" },
      scheduleFetch
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "live_chat_sessions" },
      scheduleFetch
    )
    .subscribe();
}

function subscribe(listener: Listener) {
  listeners.add(listener);
  ensureSubscription();
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot() {
  return unreadCount;
}

function getServerSnapshot() {
  return 0;
}

/** Shared live unread count for Communications → Messages nav badge */
export function useMessagesUnreadBadge() {
  const unread = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(true);
    ensureSubscription();
  }, []);

  return {
    unread: ready ? unread : 0,
    refresh: fetchUnread,
  };
}
