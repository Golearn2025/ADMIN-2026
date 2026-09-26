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
