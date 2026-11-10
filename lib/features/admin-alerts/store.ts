import type { AdminAlertSound } from "./sound";

export type AdminAlertKind = "message" | "job";

export type AdminAlertItem = {
  id: string;
  kind: AdminAlertKind;
  title: string;
  body: string;
  href: string;
  at: number;
};

type Listener = () => void;

const MAX = 30;
let items: AdminAlertItem[] = [];
let muted = false;
const seen = new Set<string>();
const listeners = new Set<Listener>();

/** Stable empty snapshot for SSR / useSyncExternalStore (must be cached). */
export const EMPTY_ADMIN_ALERTS: AdminAlertItem[] = [];

function emit() {
  listeners.forEach((l) => l());
}

export function getAdminAlerts(): AdminAlertItem[] {
  return items;
}

export function getAdminAlertsMutedFlag(): boolean {
  return muted;
}

export function setAdminAlertsMutedFlag(value: boolean) {
  muted = value;
  emit();
}

export function pushAdminAlert(
  item: Omit<AdminAlertItem, "at"> & { at?: number },
  opts?: { sound?: AdminAlertSound; play?: (k: AdminAlertSound) => void }
): boolean {
  if (seen.has(item.id)) return false;
  seen.add(item.id);
  if (seen.size > 200) {
    const drop = [...seen].slice(0, 50);
    drop.forEach((k) => seen.delete(k));
  }

  items = [{ ...item, at: item.at ?? Date.now() }, ...items].slice(0, MAX);
  emit();

  if (opts?.play && opts.sound) {
    opts.play(opts.sound);
  }
  return true;
}

/** Clear inbox alerts after Messages are read (bell ↔ Messages sync). */
export function clearAdminAlertsByKind(kind: AdminAlertKind) {
  const next = items.filter((i) => i.kind !== kind);
  if (next.length === items.length) return;
  items = next;
  emit();
}

export function dismissAdminAlert(id: string) {
  const next = items.filter((i) => i.id !== id);
  if (next.length === items.length) return;
  items = next;
  emit();
}

export function subscribeAdminAlerts(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
