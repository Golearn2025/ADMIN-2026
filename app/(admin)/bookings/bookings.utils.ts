export const getStatusBadgeVariant = (status: string) => {
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

export const getTripStatusBadgeVariant = (tripStatus: string) => {
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
  return new Date(dateString).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const formatDuration = (minutes: number | null) => {
  if (!minutes) return "";
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
};

export const getBookingTypeColor = (type: string) => {
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

export const formatBookingType = (type: string) => {
  return type
    .split("_")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

export const formatText = (text: string) => {
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
