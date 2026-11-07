/**
 * Slim AeroDataBox client for admin ops (same provider as vantage-lane-2.0).
 * One lookup per request — no background polling.
 */

export type FlightEndpoint = {
  airportName?: string | null;
  iata?: string | null;
  terminal?: string | null;
  gate?: string | null;
  scheduledAt?: string | null;
  estimatedAt?: string | null;
  actualAt?: string | null;
};

export type FlightStatusResult = {
  flightNumber: string;
  airlineName?: string | null;
  status?: string | null;
  delayMinutes?: number | null;
  departure?: FlightEndpoint;
  arrival?: FlightEndpoint;
  provider: "aerodatabox";
};

type AeroEndpoint = {
  airport?: { name?: string; iata?: string; icao?: string };
  scheduledTime?: { local?: string; utc?: string };
  revisedTime?: { local?: string; utc?: string };
  predictedTime?: { local?: string; utc?: string };
  runwayTime?: { local?: string; utc?: string };
  terminal?: string;
  gate?: string;
};

type AeroFlight = {
  number?: string;
  callSign?: string;
  status?: string;
  airline?: { name?: string; iata?: string; icao?: string };
  departure?: AeroEndpoint;
  arrival?: AeroEndpoint;
};

const DEFAULT_BASE = "https://prod.api.market/api/v1/aedbx/aerodatabox";

function mapEndpoint(ep?: AeroEndpoint): FlightEndpoint | undefined {
  if (!ep) return undefined;
  return {
    airportName: ep.airport?.name ?? null,
    iata: ep.airport?.iata ?? null,
    terminal: ep.terminal ?? null,
    gate: ep.gate ?? null,
    scheduledAt: ep.scheduledTime?.utc ?? ep.scheduledTime?.local ?? null,
    estimatedAt:
      ep.revisedTime?.utc ??
      ep.predictedTime?.utc ??
      ep.revisedTime?.local ??
      ep.predictedTime?.local ??
      null,
    actualAt: ep.runwayTime?.utc ?? ep.runwayTime?.local ?? null,
  };
}

function delayMinutes(scheduled?: string | null, estimated?: string | null): number | null {
  if (!scheduled || !estimated) return null;
  const s = Date.parse(scheduled);
  const e = Date.parse(estimated);
  if (!Number.isFinite(s) || !Number.isFinite(e)) return null;
  const diff = Math.round((e - s) / 60000);
  return diff === 0 ? null : diff;
}

function normalize(raw: AeroFlight, entered: string): FlightStatusResult {
  const departure = mapEndpoint(raw.departure);
  const arrival = mapEndpoint(raw.arrival);
  return {
    flightNumber: (raw.number ?? entered).toUpperCase().replace(/\s+/g, ""),
    airlineName: raw.airline?.name ?? null,
    status: raw.status ?? null,
    delayMinutes:
      delayMinutes(arrival?.scheduledAt, arrival?.estimatedAt) ??
      delayMinutes(departure?.scheduledAt, departure?.estimatedAt),
    departure,
    arrival,
    provider: "aerodatabox",
  };
}

function addDaysYmd(ymd: string, delta: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + delta);
  return dt.toISOString().slice(0, 10);
}

/** London calendar date from an ISO timestamp. */
export function londonDateYmd(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return null;
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/London",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

async function fetchByNumber(flightNumber: string, dateLocal: string): Promise<AeroFlight[]> {
  const apiKey = process.env.AERODATABOX_API_KEY;
  if (!apiKey) {
    throw new Error("AERODATABOX_API_KEY is not configured");
  }

  const base = (process.env.AERODATABOX_BASE_URL ?? DEFAULT_BASE).replace(/\/$/, "");
  const ident = encodeURIComponent(flightNumber.replace(/\s+/g, ""));
  const date = encodeURIComponent(dateLocal);
  const url = `${base}/flights/Number/${ident}/${date}?dateLocalRole=Arrival`;

  const res = await fetch(url, {
    headers: {
      "x-api-market-key": apiKey,
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (res.status === 204) return [];
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`AeroDataBox ${res.status}: ${text.slice(0, 200)}`);
  }

  const data = await res.json();
  if (Array.isArray(data)) return data as AeroFlight[];
  if (data && typeof data === "object" && Array.isArray((data as { flights?: unknown }).flights)) {
    return (data as { flights: AeroFlight[] }).flights;
  }
  return [];
}

/**
 * Lookup arrival status for a flight number on a London local date.
 * Tries primary date, then ±1 day for overnight boundary cases.
 */
export async function lookupFlightArrivalStatus(params: {
  flightNumber: string;
  dateYmd: string;
}): Promise<FlightStatusResult | null> {
  const entered = params.flightNumber.trim();
  if (!entered || !params.dateYmd) return null;

  const dates = [
    params.dateYmd,
    addDaysYmd(params.dateYmd, -1),
    addDaysYmd(params.dateYmd, 1),
  ];

  for (const date of dates) {
    const rows = await fetchByNumber(entered, date);
    if (rows.length > 0) {
      return normalize(rows[0], entered);
    }
  }
  return null;
}
