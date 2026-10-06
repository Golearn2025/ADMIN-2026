import type { LiveDriver } from "../types";

/** Same lifecycle as the Trip column in Bookings (booking_legs.status). */
export type LiveDriverStatus = "ONLINE_IDLE" | "ASSIGNED" | "EN_ROUTE" | "ARRIVED" | "ONBOARD";

export const LIVE_DRIVER_STATUSES: LiveDriverStatus[] = [
  "ONLINE_IDLE",
  "ASSIGNED",
  "EN_ROUTE",
  "ARRIVED",
  "ONBOARD",
];

export const LIVE_DRIVER_STATUS_META: Record<
  LiveDriverStatus,
  { label: string; color: string; pulse: boolean }
> = {
  ONLINE_IDLE: { label: "Online · free", color: "#22C55E", pulse: false },
  ASSIGNED: { label: "Assigned", color: "#3B82F6", pulse: false },
  EN_ROUTE: { label: "En route", color: "#F59E0B", pulse: true },
  ARRIVED: { label: "Arrived", color: "#A855F7", pulse: true },
  ONBOARD: { label: "Onboard", color: "#D4AF37", pulse: true },
};

export function getLiveDriverStatus(
  driver: Pick<LiveDriver, "normalized_status">
): LiveDriverStatus {
  switch (driver.normalized_status) {
    case "ASSIGNED":
    case "EN_ROUTE":
    case "ARRIVED":
    case "ONBOARD":
      return driver.normalized_status;
    default:
      return "ONLINE_IDLE";
  }
}
