import type { Booking } from "@/app/(admin)/bookings/types";

export type BookingShareContext = {
  driver_payout_pence: number | null;
  currency: string;
  pickup_lat: number | null;
  pickup_lng: number | null;
  dropoff_lat: number | null;
  dropoff_lng: number | null;
  passenger_count: number | null;
  bag_count: number | null;
  tier_factor?: number | null;
  /** Driver jobs list format from Google Places: "EC3R • London" */
  pickup_preview?: string | null;
  dropoff_preview?: string | null;
  /** Full street addresses for Share Private */
  pickup_address_full?: string | null;
  dropoff_address_full?: string | null;
  customer_name?: string | null;
  customer_phone?: string | null;
};

interface BookingExtras {
  included_services_json?: string[];
  paid_upgrades_json?: Record<string, unknown>;
  premium_features_json?: Record<string, unknown>;
  additional_stops_json?: Array<{ address: string; order?: number }> | null;
}

const DRIVER_STANDARDS_URL = "https://vantage-lane.com/driversnetwork";

/** Full UK postcode e.g. UB7 0DU */
const UK_POSTCODE_FULL_RE =
  /\b([A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2})\b/i;

/** Outward-only e.g. HA5, SW1A */
const UK_POSTCODE_OUTWARD_RE =
  /\b([A-Z]{1,2}\d[A-Z\d]?)\b/i;

function formatDateTime(dateString: string): string {
  const date = new Date(dateString);
  const londonNow = new Date(
    new Date().toLocaleString("en-US", { timeZone: "Europe/London" })
  );
  const londonTrip = new Date(
    date.toLocaleString("en-US", { timeZone: "Europe/London" })
  );

  const startOfToday = new Date(
    londonNow.getFullYear(),
    londonNow.getMonth(),
    londonNow.getDate()
  );
  const startOfTrip = new Date(
    londonTrip.getFullYear(),
    londonTrip.getMonth(),
    londonTrip.getDate()
  );
  const dayDiff = Math.round(
    (startOfTrip.getTime() - startOfToday.getTime()) / (24 * 60 * 60 * 1000)
  );

  const time = date.toLocaleString("en-GB", {
    timeZone: "Europe/London",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  if (dayDiff === 0) return `Today, ${time}`;
  if (dayDiff === 1) return `Tomorrow, ${time}`;
  if (dayDiff === -1) return `Yesterday, ${time}`;

  const day = date.toLocaleString("en-GB", {
    timeZone: "Europe/London",
    day: "numeric",
  });
  const month = date.toLocaleString("en-GB", {
    timeZone: "Europe/London",
    month: "short",
  });
  const year = date.toLocaleString("en-GB", {
    timeZone: "Europe/London",
    year: "numeric",
  });
  return `${day} ${month} ${year}, ${time}`;
}

function formatDuration(minutes: number | null): string | null {
  if (!minutes) return null;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours <= 0) return `${mins} min`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

function formatBookingType(type: string): string {
  const types: Record<string, string> = {
    oneway: "One Way",
    return: "Return",
    hourly: "Hourly",
    daily: "Daily",
    fleet: "Fleet",
    bespoke: "Bespoke",
  };
  return types[type] || type;
}

function isAirportLocation(address: string | null | undefined): boolean {
  if (!address) return false;
  return /\b(airport|heathrow|gatwick|stansted|luton|city airport|lhr|lgw|stn|ltn|lcy)\b/i.test(
    address
  );
}

function formatServiceType(booking: Booking): string {
  const base = formatBookingType(booking.booking_type);
  if (
    booking.booking_type === "oneway" &&
    (isAirportLocation(booking.pickup_address) ||
      isAirportLocation(booking.dropoff_address))
  ) {
    return `${base} / Airport Transfer`;
  }
  return base;
}

function formatMoney(pence: number, currency = "GBP"): string {
  return (pence / 100).toLocaleString("en-GB", {
    style: "currency",
    currency,
  });
}

function shortAirportLabel(address: string): string | null {
  const iata = address.match(/\(([A-Z]{3})\)/i)?.[1]?.toUpperCase();
  if (/heathrow|\blhr\b/i.test(address)) return `Heathrow (${iata || "LHR"})`;
  if (/gatwick|\blgw\b/i.test(address)) return `Gatwick (${iata || "LGW"})`;
  if (/stansted|\bstn\b/i.test(address)) return `Stansted (${iata || "STN"})`;
  if (/luton|\bltn\b/i.test(address)) return `Luton (${iata || "LTN"})`;
  if (/london city|\blcy\b/i.test(address)) return `London City (${iata || "LCY"})`;
  if (iata) return iata;
  return null;
}

/**
 * Fallback when Google Places preview is missing.
 * Prefer outcode only (EC3R), never street — mirrors driver app privacy.
 */
export function toPublicLocation(address: string | null | undefined): string {
  if (!address) return "TBC";

  const airport = shortAirportLabel(address);
  if (airport) return airport;

  const fullPc = address.match(UK_POSTCODE_FULL_RE)?.[1];
  if (fullPc) {
    const outcode = fullPc.toUpperCase().replace(/\s+/, " ").split(/\s+/)[0];
    const before = address.slice(0, address.search(UK_POSTCODE_FULL_RE)).trim().replace(/,\s*$/, "");
    const city =
      before
        .split(",")
        .map((p) => p.trim())
        .filter(Boolean)
        .filter((p) => !/^(uk|united kingdom|england)$/i.test(p))
        .pop() || "";
    return city ? `${outcode} • ${city}` : outcode;
  }

  const outward = address.match(UK_POSTCODE_OUTWARD_RE)?.[1];
  if (outward && !/^(uk|us|eu)$/i.test(outward)) {
    return outward.toUpperCase();
  }

  const parts = address
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean)
    .filter((p) => !/^(uk|united kingdom|england)$/i.test(p))
    .filter(
      (p) =>
        !/\b(street|st\.|road|rd\.|lane|ln\.|avenue|ave\.|drive|dr\.|quay|quays|close|court|place|way|terrace)\b/i.test(
          p
        )
    );

  const area = parts[parts.length - 1] || parts[0];
  if (!area) return "Area TBC";
  if (area.length > 28 || /\d/.test(area)) {
    return area.split(/\s+/).slice(0, 2).join(" ");
  }
  return area;
}

function getRouteLink(
  booking: Booking,
  ctx: BookingShareContext | null
): string | null {
  const hasDropoff =
    !!booking.dropoff_address &&
    booking.booking_type !== "hourly" &&
    booking.booking_type !== "daily";

  if (!hasDropoff) return null;

  // Prefer ?api=1 form — WhatsApp generates map OG preview more reliably than /dir/lat,lng/lat,lng
  if (
    ctx?.pickup_lat != null &&
    ctx?.pickup_lng != null &&
    ctx?.dropoff_lat != null &&
    ctx?.dropoff_lng != null
  ) {
    return `https://www.google.com/maps/dir/?api=1&origin=${ctx.pickup_lat},${ctx.pickup_lng}&destination=${ctx.dropoff_lat},${ctx.dropoff_lng}&travelmode=driving`;
  }

  return `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(booking.pickup_address)}&destination=${encodeURIComponent(booking.dropoff_address)}&travelmode=driving`;
}

function getVehicleLine(booking: Booking): string {
  const base =
    booking.requested_vehicle_display ||
    booking.requested_vehicle_category_label ||
    "TBC";

  const modelId = (
    booking.requested_vehicle_model_id ||
    booking.requested_vehicle_model_label ||
    booking.requested_vehicle_display ||
    ""
  ).toLowerCase();

  const isEClass =
    modelId.includes("mercedes-e-class") ||
    /\be[\s-]?class\b/i.test(modelId);

  if (isEClass) {
    return `${base} – 2023+ (also EQE / EQS)`;
  }

  return `${base} – 2023+`;
}

function driverFareValue(
  booking: Booking,
  ctx: BookingShareContext | null
): string {
  const pence = ctx?.driver_payout_pence;
  if (pence == null || Number.isNaN(Number(pence))) return "TBC";
  return `${formatMoney(Number(pence), ctx?.currency || booking.latest_payment_currency || "GBP")} ALL IN`;
}

/** Your driver-post format: emoji + label */
function row(
  emoji: string,
  label: string,
  value: string | number | null | undefined
): string {
  if (value === null || value === undefined || value === "") return "";
  return `${emoji} *${label}*: ${value}`;
}

function pickupEmoji(address: string): string {
  return isAirportLocation(address) ? "✈️" : "📌";
}

function dropoffEmoji(address: string): string {
  return isAirportLocation(address) ? "✈️" : "📍";
}

function buildJobBody(options: {
  booking: Booking;
  ctx: BookingShareContext | null;
  publicLocations: boolean;
}): string {
  const { booking, ctx, publicLocations } = options;
  const hasDropoff =
    !!booking.dropoff_address &&
    booking.booking_type !== "hourly" &&
    booking.booking_type !== "daily";

  const pickup = publicLocations
    ? ctx?.pickup_preview?.trim() || toPublicLocation(booking.pickup_address)
    : ctx?.pickup_address_full?.trim() || booking.pickup_address;
  const dropoff = publicLocations
    ? ctx?.dropoff_preview?.trim() || toPublicLocation(booking.dropoff_address)
    : ctx?.dropoff_address_full?.trim() || booking.dropoff_address;

  const passengers = ctx?.passenger_count ?? booking.passenger_count ?? null;
  const luggage = ctx?.bag_count ?? booking.bag_count ?? null;

  const lines = [
    row("📍", "Date & Time", formatDateTime(booking.scheduled_at)),
    row("🚐", "Car Required", getVehicleLine(booking)),
    row("👔", "Suit", "Mandatory"),
    row(pickupEmoji(booking.pickup_address), "Pick-up", pickup),
    hasDropoff
      ? row(dropoffEmoji(booking.dropoff_address), "Drop-off", dropoff)
      : "",
    row("📝", "Type of Service", formatServiceType(booking)),
    passengers != null ? row("👥", "Passengers", passengers) : "",
    luggage != null ? row("🧳", "Luggage", luggage) : "",
    booking.distance_miles
      ? row("📏", "Distance", `${booking.distance_miles} miles`)
      : "",
    booking.duration_min
      ? row("⏱️", "Estimated Journey", formatDuration(booking.duration_min))
      : "",
    row("💰", "Driver Fare", driverFareValue(booking, ctx)),
    row("💳", "Payment", "After the job"),
  ].filter(Boolean);

  return lines.join("\n");
}

function withRouteMap(
  text: string,
  booking: Booking,
  ctx: BookingShareContext | null
): string {
  const mapUrl = getRouteLink(booking, ctx);
  // Lone Maps URL on the last line — WhatsApp only previews one link (the last one)
  return mapUrl ? `${text}\n\n${mapUrl}` : text;
}

export function getPublicShareTemplate(
  booking: Booking,
  _extras: BookingExtras | null = null,
  ctx: BookingShareContext | null = null
): string {
  const body = `*VANTAGE LANE* · ${booking.reference}

${buildJobBody({ booking, ctx, publicLocations: true })}`;
  return withRouteMap(body, booking, ctx);
}

export function getPrivateShareTemplate(
  booking: Booking,
  _extras: BookingExtras | null = null,
  ctx: BookingShareContext | null = null
): string {
  const clientName =
    ctx?.customer_name?.trim() ||
    [booking.customer_first_name, booking.customer_last_name]
      .filter(Boolean)
      .join(" ")
      .trim();

  const clientPhone =
    ctx?.customer_phone?.trim() || booking.customer_phone || null;

  const clientLines = [
    row("👤", "Client", clientName || null),
    row("📞", "Phone", clientPhone),
  ].filter(Boolean);

  const body = `*VANTAGE LANE* · ${booking.reference}

${clientLines.length ? `${clientLines.join("\n")}\n\n` : ""}${buildJobBody({ booking, ctx, publicLocations: false })}

📘 *Standards*: ${DRIVER_STANDARDS_URL}`;

  return withRouteMap(body, booking, ctx);
}

/**
 * Open WhatsApp with UTF-8 text.
 * WhatsApp Desktop app corrupts emoji from wa.me (Latin-1 mojibake).
 * Desktop → web.whatsapp.com (UTF-8 safe). Mobile → wa.me / share sheet.
 */
export async function openWhatsApp(message: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(message);
  } catch {
    /* ignore */
  }

  const mobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

  if (mobile && typeof navigator.share === "function") {
    try {
      await navigator.share({ text: message });
      return;
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
    }
  }

  const encoded = encodeURIComponent(message);
  const url = mobile
    ? `https://wa.me/?text=${encoded}`
    : `https://web.whatsapp.com/send?text=${encoded}`;

  const link = document.createElement("a");
  link.href = url;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  document.body.appendChild(link);
  link.click();
  link.remove();
}
