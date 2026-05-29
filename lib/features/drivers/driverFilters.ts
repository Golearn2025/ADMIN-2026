import type { Driver } from "./drivers.types";

export type DriverFilterTab =
  | "all"
  | "pending"
  | "approved"
  | "suspended"
  | "inactive"
  | "missing_docs"
  | "expiring";

/** În așteptare: onboarding în review sau status explicit de review/approval */
export function isPendingReview(driver: Driver): boolean {
  return (
    driver.onboarding_status === "review" ||
    driver.status === "pending_review" ||
    driver.status === "pending_approval"
  );
}

/** Aprobați / activi operațional */
export function isApprovedDriver(driver: Driver): boolean {
  return driver.status === "approved" || driver.status === "active";
}

export function isSuspendedDriver(driver: Driver): boolean {
  return driver.status === "suspended";
}

export function isInactiveDriver(driver: Driver): boolean {
  return driver.status === "inactive";
}

export function isMissingDocuments(driver: Driver): boolean {
  return driver.compliance_status === "missing";
}

/** Documente care expiră în următoarele 30 zile (nu deja expirate) */
export function isExpiringSoon(driver: Driver): boolean {
  return (driver.documents_expiring_soon ?? 0) > 0;
}

export function filterDriversByTab(
  drivers: Driver[],
  tab: DriverFilterTab
): Driver[] {
  switch (tab) {
    case "pending":
      return drivers.filter(isPendingReview);
    case "approved":
      return drivers.filter(isApprovedDriver);
    case "suspended":
      return drivers.filter(isSuspendedDriver);
    case "inactive":
      return drivers.filter(isInactiveDriver);
    case "missing_docs":
      return drivers.filter(isMissingDocuments);
    case "expiring":
      return drivers.filter(isExpiringSoon);
    default:
      return drivers;
  }
}

export function countDriversByTab(drivers: Driver[]) {
  return {
    all: drivers.length,
    pending: drivers.filter(isPendingReview).length,
    approved: drivers.filter(isApprovedDriver).length,
    suspended: drivers.filter(isSuspendedDriver).length,
    inactive: drivers.filter(isInactiveDriver).length,
    missing_docs: drivers.filter(isMissingDocuments).length,
    expiring: drivers.filter(isExpiringSoon).length,
  };
}
