"use client";

import { useEffect, useSyncExternalStore } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  EMPTY_ADMIN_ALERTS,
  clearAdminAlertsByKind,
  dismissAdminAlert,
  getAdminAlerts,
  getAdminAlertsMutedFlag,
  pushAdminAlert,
  setAdminAlertsMutedFlag,
  subscribeAdminAlerts,
} from "./store";
import {
  isAdminAlertsMuted,
  playAdminAlertSound,
  playAdminAlertSoundNow,
  primeAdminAlertAudio,
  setAdminAlertsMuted,
} from "./sound";

type PulsePayload = {
  unread: number;
  latestSession: {
    id: string;
    updatedAt: string;
    preview: string | null;
    lastSenderType: string | null;
    unread: number;
  } | null;
  latestJob: {
    id: string;
    reference: string;
    createdAt: string;
  } | null;
};

/** Industry default: Realtime primary; poll only when channel is down. */
const FALLBACK_POLL_MS = 30_000;
/** Give Realtime time to SUBSCRIBED before starting fallback poll. */
const REALTIME_GRACE_MS = 8_000;

let bootstrapped = false;
let channel: ReturnType<ReturnType<typeof createClient>["channel"]> | null =
  null;
let pollTimer: ReturnType<typeof setInterval> | null = null;
let graceTimer: ReturnType<typeof setTimeout> | null = null;
let realtimeOk = false;
let lastUnread: number | null = null;
let lastSessionKey: string | null = null;
let lastJobId: string | null = null;
let primed = false;

function emitMessageAlert(args: {
  id: string;
  body: string;
  playSound: boolean;
}) {
  pushAdminAlert(
    {
      id: args.id,
      kind: "message",
      title: "New driver message",
      body: args.body.slice(0, 120) || "Open Messages",
      href: "/communications/messages",
    },
    args.playSound
      ? { sound: "message", play: playAdminAlertSound }
      : undefined
  );
  window.dispatchEvent(new CustomEvent("admin-messages-refresh"));
}

function emitJobAlert(args: {
  id: string;
  reference: string;
  playSound: boolean;
}) {
  pushAdminAlert(
    {
      id: `job:${args.id}`,
      kind: "job",
      title: "New job",
      body: args.reference ? `Booking ${args.reference}` : "Open All Bookings",
      href: "/bookings",
    },
    args.playSound ? { sound: "job", play: playAdminAlertSound } : undefined
  );
  window.dispatchEvent(new CustomEvent("admin-bookings-refresh"));
}

function syncUnreadBadge(unread: number) {
  window.dispatchEvent(
    new CustomEvent("admin-unread-sync", { detail: { unread } })
  );
}

async function fetchPulse(): Promise<PulsePayload | null> {
  try {
    const res = await fetch("/api/admin/communications/messages/pulse", {
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as PulsePayload;
  } catch {
    return null;
  }
}

function applyPulse(pulse: PulsePayload, opts: { playSound: boolean }) {
  const unread = Number(pulse.unread) || 0;

  if (lastUnread == null) {
    // First snapshot — seed only, no sound (avoid blast on page load)
    lastUnread = unread;
    lastSessionKey = pulse.latestSession
      ? `${pulse.latestSession.id}:${pulse.latestSession.updatedAt}`
      : null;
    lastJobId = pulse.latestJob?.id ?? null;
    if (unread === 0) clearAdminAlertsByKind("message");
    syncUnreadBadge(unread);
    primed = true;
    return;
  }

  const sessionKey = pulse.latestSession
    ? `${pulse.latestSession.id}:${pulse.latestSession.updatedAt}`
    : null;

  // SSOT: no unread left → clear message alerts in bell (sync with Messages)
  if (unread === 0 && lastUnread > 0) {
    clearAdminAlertsByKind("message");
  }

  const unreadUp = unread > lastUnread;
  const sessionTouched =
    !!sessionKey &&
    sessionKey !== lastSessionKey &&
    pulse.latestSession?.lastSenderType === "driver";

  if (unreadUp || (sessionTouched && unread > 0)) {
    emitMessageAlert({
      id: `pulse-msg:${sessionKey || unread}:${Date.now()}`,
      body: pulse.latestSession?.preview || "New driver message",
      playSound: opts.playSound,
    });
  }

  if (pulse.latestJob?.id) {
    if (lastJobId == null) {
      lastJobId = pulse.latestJob.id;
    } else if (pulse.latestJob.id !== lastJobId) {
      emitJobAlert({
        id: pulse.latestJob.id,
        reference: pulse.latestJob.reference,
        playSound: opts.playSound,
      });
      lastJobId = pulse.latestJob.id;
    }
  }

  lastUnread = unread;
  lastSessionKey = sessionKey;
  syncUnreadBadge(unread);
  primed = true;
}

function stopPulseFallback() {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

function startPulseFallback() {
  if (pollTimer || realtimeOk) return;

  const tick = async () => {
    if (realtimeOk) return;
    if (typeof document !== "undefined" && document.visibilityState === "hidden") {
      return;
    }
    const pulse = await fetchPulse();
    if (pulse) applyPulse(pulse, { playSound: true });
  };

  void tick();
  pollTimer = setInterval(() => void tick(), FALLBACK_POLL_MS);
}

function onRealtimeStatus(status: string) {
  if (process.env.NODE_ENV === "development") {
    console.log("[admin-alerts] realtime:", status);
  }

  if (status === "SUBSCRIBED") {
    realtimeOk = true;
    if (graceTimer) {
      clearTimeout(graceTimer);
      graceTimer = null;
    }
    stopPulseFallback();
    return;
  }

  if (
    status === "CHANNEL_ERROR" ||
    status === "TIMED_OUT" ||
    status === "CLOSED"
  ) {
    realtimeOk = false;
    startPulseFallback();
  }
}

async function startRealtime() {
  const supabase = createClient();

  // Wait for auth JWT — postgres_changes is RLS-filtered with auth.uid()
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && (event === "INITIAL_SESSION" || event === "SIGNED_IN")) {
        subscription.unsubscribe();
        void startRealtime();
      }
    });
    return;
  }

  if (channel) {
    void supabase.removeChannel(channel);
    channel = null;
  }

  channel = supabase
    .channel(`admin_alerts_v2:${Date.now()}`)
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "live_chat_messages" },
      (payload) => {
        const row = payload.new as {
          id?: string;
          sender_type?: string;
          message?: string | null;
        };
        if (!row?.id || row.sender_type !== "driver") return;
        emitMessageAlert({
          id: `msg:${row.id}`,
          body: row.message || "Open Messages",
          playSound: true,
        });
        void fetchPulse().then((p) => {
          if (p) applyPulse(p, { playSound: false });
        });
      }
    )
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "bookings" },
      (payload) => {
        const row = payload.new as {
          id?: string;
          reference?: string;
          organization_id?: string;
        };
        if (!row?.id) return;
        const org =
          typeof window !== "undefined"
            ? localStorage.getItem("currentOrganizationId")
            : null;
        if (org && row.organization_id && row.organization_id !== org) return;
        emitJobAlert({
          id: row.id,
          reference: row.reference || "",
          playSound: true,
        });
        void fetchPulse().then((p) => {
          if (p) applyPulse(p, { playSound: false });
        });
      }
    )
    .subscribe((status) => {
      onRealtimeStatus(status);
    });
}

async function seedPulseOnce() {
  const pulse = await fetchPulse();
  if (pulse) applyPulse(pulse, { playSound: false });
}

function bootstrap() {
  if (bootstrapped || typeof window === "undefined") return;
  bootstrapped = true;
  primeAdminAlertAudio();
  setAdminAlertsMutedFlag(isAdminAlertsMuted());

  // One SSOT snapshot on load — not a standing poll
  void seedPulseOnce();
  void startRealtime();

  // If Realtime never reaches SUBSCRIBED, start slow fallback
  graceTimer = setTimeout(() => {
    graceTimer = null;
    if (!realtimeOk) startPulseFallback();
  }, REALTIME_GRACE_MS);

  // Returning to tab: one catch-up pulse (not a loop)
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState !== "visible") return;
    void seedPulseOnce();
  });
}

export function useAdminAlerts() {
  const alerts = useSyncExternalStore(
    subscribeAdminAlerts,
    getAdminAlerts,
    () => EMPTY_ADMIN_ALERTS
  );
  const muted = useSyncExternalStore(
    subscribeAdminAlerts,
    getAdminAlertsMutedFlag,
    getAdminAlertsMutedFlag
  );

  useEffect(() => {
    bootstrap();
  }, []);

  useEffect(() => {
    const onRead = () => {
      clearAdminAlertsByKind("message");
    };
    window.addEventListener("admin-messages-read", onRead);
    return () => window.removeEventListener("admin-messages-read", onRead);
  }, []);

  const toggleMute = () => {
    const next = !isAdminAlertsMuted();
    setAdminAlertsMuted(next);
    setAdminAlertsMutedFlag(next);
  };

  const jobAlertCount = alerts.filter((a) => a.kind === "job").length;

  return {
    alerts,
    muted,
    toggleMute,
    testSound: () => playAdminAlertSoundNow("message"),
    dismissAlert: dismissAdminAlert,
    clearMessageAlerts: () => clearAdminAlertsByKind("message"),
    primed,
    jobAlertCount,
    totalSessionAlerts: alerts.length,
  };
}
