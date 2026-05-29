import type { Driver } from "./drivers.types";

export type DriverFilterTab =
  | "all"
  | "pending"
  | "approved"
  | "suspended"
  | "inactive"
  | "missing_docs"
  | "expiring";

const TERMINAL_STATUSES = new Set(["suspended", "inactive"]);

/** Suspendat — nu primește curse */
export function isSuspendedDriver(driver: Driver): boolean {
  return driver.status === "suspended";
}

/** Dezactivat */
export function isInactiveDriver(driver: Driver): boolean {
  return driver.status === "inactive";
}

/**
 * Aprobat / activ operațional — poate fi activat sau deja activ.
 * Sursă: is_approved + status (nu onboarding_status).
 */
export function isApprovedDriver(driver: Driver): boolean {
  if (TERMINAL_STATUSES.has(driver.status)) return false;
  return (
    driver.is_approved === true &&
    (driver.status === "approved" ||
      driver.status === "active" ||
      driver.status === "pending_review")
  );
}

/**
 * Pending Review — șoferi neactivați / în așteptarea deciziei admin.
 * NU include șoferi deja is_approved (chiar dacă onboarding_status e încă „review”).
 */
export function isPendingReview(driver: Driver): boolean {
  if (TERMINAL_STATUSES.has(driver.status)) return false;
  if (isApprovedDriver(driver)) return false;

  return (
    driver.status === "pending_review" ||
    driver.status === "pending_approval" ||
    driver.status === "draft" ||
    driver.onboarding_status === "review" ||
    driver.onboarding_status === "submitted" ||
    !driver.is_approved ||
    !driver.is_active
  );
}

export function isMissingDocuments(driver: Driver): boolean {
  return driver.compliance_status === "missing";
}

/** Documente care expiră în următoarele 30 zile */
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
