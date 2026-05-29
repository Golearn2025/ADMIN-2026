import type { Driver } from "./drivers.types";

type RawDriver = Record<string, unknown> & {
  id: string;
  first_name: string;
  last_name: string;
  expired_driver_docs?: number;
  expired_vehicle_docs?: number;
  total_approved_docs?: number;
  total_required_docs?: number;
  created_at?: string;
};

export function enrichDriverRow(
  driver: RawDriver,
  expiringSoonByDriverId?: Set<string>
): Driver {
  const expired =
    (driver.expired_driver_docs ?? 0) + (driver.expired_vehicle_docs ?? 0);
  const expiringSoon = expiringSoonByDriverId?.has(driver.id) ? 1 : 0;

  return {
    ...(driver as Driver),
    full_name: `${driver.first_name} ${driver.last_name}`,
    documents_completed: driver.total_approved_docs ?? 0,
    documents_expired: expired,
    documents_expiring_soon: expiringSoon,
    documents_required: driver.total_required_docs ?? 0,
    member_since: driver.created_at,
  };
}

export function enrichDriversList(
  drivers: RawDriver[],
  expiringSoonByDriverId?: Set<string>
): Driver[] {
  return drivers.map((d) => enrichDriverRow(d, expiringSoonByDriverId));
}
