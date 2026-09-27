/** Paid + future pickup — for Next up strip (read-only UI). */
export const isPaidUpcomingBooking = (b: {
  scheduled_at?: string | null;
  status?: string | null;
  latest_payment_status?: string | null;
  trip_status?: string | null;
}) => {
  const payment = (b.latest_payment_status || "").toLowerCase();
  const paid = payment === "succeeded" || payment === "paid";
  if (!paid) return false;

  const status = (b.status || "").toLowerCase();
  if (status === "completed" || status === "cancelled" || status === "canceled" || status === "failed") {
    return false;
  }

  const trip = (b.trip_status || "").toLowerCase();
  if (trip === "completed" || trip === "cancelled" || trip === "canceled") {
    return false;
  }

  if (!b.scheduled_at) return false;
  const when = new Date(b.scheduled_at).getTime();
  if (Number.isNaN(when)) return false;
  return when >= Date.now() - 60_000; // 1 min grace
};

export const isBookingUnassigned = (b: { driver_name?: string | null; trip_status?: string | null }) => {
  const trip = (b.trip_status || "").toLowerCase();
  if (trip === "pending" || trip === "unassigned") return true;
  return !b.driver_name?.trim();
};

/** Hours until pickup (negative = past). */
export function hoursUntilPickup(scheduled_at?: string | null): number | null {
  if (!scheduled_at) return null;
  const t = new Date(scheduled_at).getTime();
  if (Number.isNaN(t)) return null;
  return (t - Date.now()) / 3_600_000;
}

/** Human countdown until pickup (updates every minute in UI). */
export function formatTimeUntilPickup(scheduled_at?: string | null): string {
  const hours = hoursUntilPickup(scheduled_at);
  if (hours == null) return "—";
  if (hours < -1 / 60) return "Overdue";
  if (hours <= 0) return "Starting now";

  const totalMinutes = Math.max(1, Math.round(hours * 60));
  if (totalMinutes < 60) return `in ${totalMinutes} min`;

  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  if (h < 24) {
    return m > 0 ? `in ${h}h ${m}m` : `in ${h}h`;
  }

  const days = Math.floor(h / 24);
  const remH = h % 24;
  if (days < 60) {
    return remH > 0 ? `in ${days}d ${remH}h` : `in ${days}d`;
  }

  const months = Math.floor(days / 30);
  const remDays = days % 30;
  return remDays > 0 ? `in ${months}mo ${remDays}d` : `in ${months}mo`;
}

/** Ops priority for paid upcoming rows — left bar only (no full-row flash). */
export type BookingOpsTier = "critical" | "warning" | "ok" | "watch";

export function getBookingOpsTier(b: {
  scheduled_at?: string | null;
  status?: string | null;
  latest_payment_status?: string | null;
  trip_status?: string | null;
  driver_name?: string | null;
}): BookingOpsTier | null {
  if (!isPaidUpcomingBooking(b)) return null;
  const hours = hoursUntilPickup(b.scheduled_at);
  if (hours == null) return null;

  const unassigned = isBookingUnassigned(b);

  // ≤3h + no driver → urgent
  if (unassigned && hours <= 3) return "critical";
  // ≤24h + no driver, or ≤3h with driver (pickup iminent)
  if ((unassigned && hours <= 24) || (!unassigned && hours <= 3)) return "warning";
  // assigned, pickup >3h → OK
  if (!unassigned) return "ok";
  // unassigned, >24h (e.g. November) — de urmărit, fără panică
  return "watch";
}

export function getSoonestUpcomingBookingId(
  bookings: { id: string; scheduled_at?: string | null }[]
): string | null {
  let best: { id: string; t: number } | null = null;
  for (const b of bookings) {
    if (!b.scheduled_at) continue;
    const t = new Date(b.scheduled_at).getTime();
    if (Number.isNaN(t)) continue;
    if (!best || t < best.t) best = { id: b.id, t };
  }
  return best?.id ?? null;
}

export function getBookingOpsTierMeta(
  tier: BookingOpsTier,
  opts?: { isSoonest?: boolean }
) {
  const map: Record<
    BookingOpsTier,
    { label: string; rowClass: string; cardClass: string; badgeVariant: "error" | "warning" | "success" | "neutral" | "primary" }
  > = {
    critical: {
      label: "Urgent",
      rowClass: "booking-row-ops booking-row-ops-critical booking-row-ops-audi",
      cardClass: "booking-card-ops booking-card-ops-critical booking-card-ops-audi",
      badgeVariant: "error",
    },
    warning: {
      label: "Soon",
      rowClass: "booking-row-ops booking-row-ops-warning booking-row-ops-audi-slow",
      cardClass: "booking-card-ops booking-card-ops-warning booking-card-ops-audi-slow",
      badgeVariant: "warning",
    },
    watch: {
      label: "Needs driver",
      rowClass: "booking-row-ops booking-row-ops-watch booking-row-ops-muted",
      cardClass: "booking-card-ops booking-card-ops-watch booking-card-ops-muted",
      badgeVariant: "warning",
    },
    ok: {
      label: "Ready",
      rowClass: "booking-row-ops booking-row-ops-ok booking-row-ops-muted",
      cardClass: "booking-card-ops booking-card-ops-ok booking-card-ops-muted",
      badgeVariant: "success",
    },
  };

  const base = map[tier];
  if (!opts?.isSoonest) return base;

  const soonestLabel =
    tier === "ok" ? "Next job" : tier === "watch" ? "Next · needs driver" : "Next · " + base.label;

  const soonestRowExtra =
    tier === "ok"
      ? " booking-row-ops-soonest booking-row-ops-audi-slow"
      : tier === "watch"
        ? " booking-row-ops-soonest booking-row-ops-audi-slow"
        : " booking-row-ops-soonest";

  const soonestCardExtra =
    tier === "ok" || tier === "watch"
      ? " booking-card-ops-soonest booking-card-ops-audi-slow"
      : " booking-card-ops-soonest";

  return {
    ...base,
    label: soonestLabel,
    rowClass: base.rowClass.replace(" booking-row-ops-muted", "") + soonestRowExtra,
    cardClass: base.cardClass.replace(" booking-card-ops-muted", "") + soonestCardExtra,
    badgeVariant: tier === "ok" ? ("primary" as const) : base.badgeVariant,
  };
}

export const getStatusBadgeVariant = (status?: string) => {
  if (!status) return "neutral";
  
  const statusMap: Record<string, "success" | "warning" | "error" | "neutral" | "primary"> = {
    completed: "success",
    confirmed: "success",
    in_progress: "primary",
    pending: "warning",
    cancelled: "error",
    failed: "error",
  };
  return statusMap[status.toLowerCase()] || "neutral";
};

export const getTripStatusBadgeVariant = (tripStatus?: string) => {
  if (!tripStatus) return "neutral";
  
  const statusMap: Record<string, "success" | "warning" | "error" | "neutral" | "info" | "primary"> = {
    pending: "neutral",
    assigned: "info",
    en_route: "warning",
    arrived_at_pickup: "warning",
    passenger_onboard: "info",
    completed: "success",
    cancelled: "error",
  };
  return statusMap[tripStatus.toLowerCase()] || "neutral";
};

export const getPaymentBadgeVariant = (status?: string) => {
  if (!status) return "neutral";
  const statusMap: Record<string, "success" | "warning" | "error" | "neutral"> = {
    paid: "success",
    succeeded: "success",
    pending: "warning",
    processing: "warning",
    failed: "error",
    refunded: "neutral",
  };
  return statusMap[status.toLowerCase()] || "neutral";
};

export const formatPrice = (pence: number, currency: string) => {
  const amount = pence / 100;
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: currency || "GBP",
  }).format(amount);
};

export const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleString("en-GB", {
    timeZone: "Europe/London",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
};

/** UK operational time with explicit timezone label. */
export const formatUkDateTime = (dateString: string | null | undefined) => {
  if (!dateString) return "—";
  return `${formatDate(dateString)} UK`;
};

export const formatDuration = (minutes: number | null) => {
  if (!minutes) return "";
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
};

export const getBookingTypeColor = (type?: string) => {
  if (!type) return "text-gray-500";
  
  const colorMap: Record<string, string> = {
    oneway: "text-blue-500",
    return: "text-green-500",
    fleet: "text-purple-500",
    hourly: "text-cyan-500",
    daily: "text-yellow-500",
    book_by_day: "text-yellow-500",
    book_by_hour: "text-cyan-500",
    bespoke: "text-red-500",
  };
  return colorMap[type.toLowerCase()] || "text-gray-500";
};

export const formatBookingType = (type?: string) => {
  if (!type) return "";
  
  return type
    .split("_")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

export const formatText = (text?: string) => {
  if (!text) return "";
  
  return text
    .split("_")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

export const getVehicleCategoryVariant = (category: string | null | undefined) => {
  if (!category) return "neutral";
  const variantMap: Record<string, "neutral" | "primary" | "purple" | "dark"> = {
    executive: "neutral",
    luxury: "primary",
    suv: "purple",
    mpv: "dark",
  };
  return variantMap[category.toLowerCase()] || "neutral";
};
