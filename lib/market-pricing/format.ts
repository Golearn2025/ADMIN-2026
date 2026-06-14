/** Pence → £ string with 2 decimals */
export function penceToGbp(pence: number): string {
  return (pence / 100).toFixed(2);
}

/** £ string / number → pence (rounded) */
export function gbpToPence(gbp: string | number): number | null {
  const n = typeof gbp === "string" ? parseFloat(gbp.replace(/[£,]/g, "")) : gbp;
  if (isNaN(n) || n < 0) return null;
  return Math.round(n * 100);
}

/** Format for display: "£192.50" */
export function formatGbp(pence: number | null | undefined): string {
  if (pence == null) return "—";
  return `£${penceToGbp(pence)}`;
}

/** Format delta: "+£14" or "−£6" */
export function formatDelta(pence: number): string {
  if (pence === 0) return "£0";
  const sign = pence > 0 ? "+" : "−";
  return `${sign}£${Math.abs(pence / 100).toFixed(2)}`;
}

/** Format percent: "+7.9%" or "−3.0%" */
export function formatPct(pct: number): string {
  if (pct === 0) return "0%";
  const sign = pct > 0 ? "+" : "";
  return `${sign}${pct.toFixed(1)}%`;
}

/** "£/mi" display */
export function formatPerMile(pence: number, miles: number | null): string {
  if (!miles || miles === 0) return "—";
  return `£${(pence / 100 / miles).toFixed(2)}/mi`;
}

/** "£/h" display */
export function formatPerHour(pence: number, hours: number | null): string {
  if (!hours || hours === 0) return "—";
  return `£${(pence / 100 / hours).toFixed(2)}/h`;
}

export const VEHICLE_CATEGORY_LABELS: Record<string, string> = {
  executive: "Executive",
  luxury: "Luxury",
  suv: "SUV",
  mpv: "MPV / Van",
};

export const TRIP_TYPE_LABELS: Record<string, string> = {
  airport_pickup: "Airport Pickup",
  airport_dropoff: "Airport Dropoff",
  distance: "Distance",
  hourly: "Hourly",
  daily: "Daily",
};

/** Normalize a website URL to a full https:// URL for use in href */
export function toFullUrl(raw: string): string {
  const trimmed = raw.trim().replace(/^(https?:\/\/)+/, "");
  return `https://${trimmed}`;
}

/** Strip protocol for display (e.g. "blacklane.com") */
export function displayUrl(raw: string): string {
  return raw.trim().replace(/^https?:\/\//, "").replace(/\/$/, "");
}

export const BAND_LABELS: Record<string, string> = {
  short: "Short",
  medium: "Medium",
  long: "Long",
  very_long: "Very Long",
};
