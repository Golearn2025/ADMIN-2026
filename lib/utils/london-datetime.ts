/**
 * datetime-local values are wall-clock strings with no timezone.
 * Admin UI labels them as UK time (Europe/London) — convert to UTC ISO
 * before sending to pricing / booking APIs.
 */

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function londonParts(ms: number): {
  y: number;
  mo: number;
  d: number;
  h: number;
  mi: number;
  s: number;
} {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(ms));

  const get = (type: string) =>
    Number(parts.find((p) => p.type === type)?.value ?? "0");

  return {
    y: get("year"),
    mo: get("month"),
    d: get("day"),
    h: get("hour"),
    mi: get("minute"),
    s: get("second"),
  };
}

/**
 * Convert a London wall time (`YYYY-MM-DDTHH:mm` or with seconds) to UTC ISO.
 * Pass-through if already ISO with Z / offset.
 */
export function londonLocalToUtcIso(local: string): string {
  if (!local) return local;
  if (/[zZ]|[+-]\d{2}:\d{2}$/.test(local)) {
    const d = new Date(local);
    return Number.isNaN(d.getTime()) ? local : d.toISOString();
  }

  const m = local.match(
    /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?/
  );
  if (!m) return local;

  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const h = Number(m[4]);
  const mi = Number(m[5]);
  const s = Number(m[6] ?? "0");

  // Desired wall clock as if it were UTC components, then correct for London offset
  let guess = Date.UTC(y, mo - 1, d, h, mi, s);
  for (let i = 0; i < 3; i++) {
    const p = londonParts(guess);
    const asUtcFromParts = Date.UTC(p.y, p.mo - 1, p.d, p.h, p.mi, p.s);
    const desired = Date.UTC(y, mo - 1, d, h, mi, s);
    guess += desired - asUtcFromParts;
  }

  return new Date(guess).toISOString();
}

/** Format a UTC instant for datetime-local (Europe/London wall). */
export function utcIsoToLondonLocalInput(iso: string): string {
  if (!iso) return "";
  const ms = new Date(iso).getTime();
  if (Number.isNaN(ms)) return "";
  const p = londonParts(ms);
  return `${p.y}-${pad(p.mo)}-${pad(p.d)}T${pad(p.h)}:${pad(p.mi)}`;
}
