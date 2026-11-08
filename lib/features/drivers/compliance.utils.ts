import type { Driver, DriverDocument, VehicleDocument } from "./drivers.types";

export const DRIVER_DOC_LABELS: Record<string, string> = {
  driving_licence: "Driving Licence",
  electronic_counterpart: "Electronic Counterpart",
  pco_licence: "PCO Licence",
  bank_statement: "Bank Statement",
  proof_of_identity: "Proof of Identity",
  proof_of_address: "Proof of Address",
};

/** Required vehicle paperwork (not photos). hire_agreement is optional. */
export const VEHICLE_PAPER_LABELS: Record<string, string> = {
  phv_licence: "PHV Licence",
  mot_certificate: "MOT Certificate",
  insurance_certificate: "Insurance Certificate",
  v5c_logbook: "V5C Logbook",
};

export const VEHICLE_PHOTO_LABELS: Record<string, string> = {
  vehicle_photo_exterior_front: "Exterior Front Photo",
  vehicle_photo_exterior_rear: "Exterior Rear Photo",
  vehicle_photo_interior_front: "Interior Front Photo",
  vehicle_photo_interior_rear: "Interior Rear Photo",
};

/** All vehicle document labels shown in admin (papers + photos + optional). */
export const VEHICLE_DOC_LABELS: Record<string, string> = {
  ...VEHICLE_PAPER_LABELS,
  ...VEHICLE_PHOTO_LABELS,
  hire_agreement: "Hire Agreement (optional)",
};

/**
 * Vehicle document types that do not block driver approval / compliance.
 * Photos optional until driver app supports reliable vehicle photo upload.
 */
export const OPTIONAL_VEHICLE_DOCUMENT_TYPES = new Set([
  "hire_agreement",
  "vehicle_photo_exterior_front",
  "vehicle_photo_exterior_rear",
  "vehicle_photo_interior_front",
  "vehicle_photo_interior_rear",
]);

export const REQUIRED_DRIVER_DOC_TYPES = Object.keys(DRIVER_DOC_LABELS);
export const REQUIRED_VEHICLE_PAPER_TYPES = Object.keys(VEHICLE_PAPER_LABELS);
/** Shown in UI, but optional for totals / approval (see OPTIONAL_VEHICLE_DOCUMENT_TYPES). */
export const REQUIRED_VEHICLE_PHOTO_TYPES = Object.keys(VEHICLE_PHOTO_LABELS);
/** Required vehicle docs for compliance totals (papers only). */
export const REQUIRED_VEHICLE_DOC_TYPES = [...REQUIRED_VEHICLE_PAPER_TYPES];

export type ComplianceDocRow = {
  key: string;
  label: string;
  status: "approved" | "pending" | "rejected" | "expired" | "missing";
  expiryDate?: string | null;
  entity: "driver" | "vehicle";
  vehicleLabel?: string;
  optional?: boolean;
  kind?: "paper" | "photo";
};

export type ComplianceCounts = {
  rows: ComplianceDocRow[];
  approved: number;
  pending: number;
  missing: number;
  expired: number;
  rejected: number;
};

function docStatus(
  doc: DriverDocument | VehicleDocument | undefined
): ComplianceDocRow["status"] {
  if (!doc) return "missing";
  if (doc.status === "approved") {
    if (doc.expiry_date && new Date(doc.expiry_date) < new Date()) return "expired";
    return "approved";
  }
  if (doc.status === "expired") return "expired";
  if (doc.status === "rejected") return "rejected";
  if (doc.status === "pending") return "pending";
  return "missing";
}

function countComplianceRows(rows: ComplianceDocRow[]): ComplianceCounts {
  let approved = 0;
  let pending = 0;
  let missing = 0;
  let expired = 0;
  let rejected = 0;
  for (const row of rows) {
    if (row.optional) continue;
    if (row.status === "approved") approved++;
    else if (row.status === "pending") pending++;
    else if (row.status === "expired") expired++;
    else if (row.status === "rejected") rejected++;
    else if (row.status === "missing") missing++;
  }
  return { rows, approved, pending, missing, expired, rejected };
}

export function buildDriverComplianceRows(
  driverDocuments: DriverDocument[],
  _requiredCount?: number
): ComplianceCounts {
  const byType = new Map(driverDocuments.map((d) => [d.document_type, d]));

  const rows: ComplianceDocRow[] = REQUIRED_DRIVER_DOC_TYPES.map((type) => {
    const doc = byType.get(type);
    return {
      key: `driver-${type}`,
      label: DRIVER_DOC_LABELS[type] || type.replace(/_/g, " "),
      status: docStatus(doc),
      expiryDate: doc?.expiry_date,
      entity: "driver",
    };
  });

  return countComplianceRows(rows);
}

export function buildVehicleComplianceRows(
  vehicleDocuments: VehicleDocument[],
  vehicles: { id?: string; vehicle_id?: string; license_plate?: string; plate?: string }[],
  _vehicleRequiredPerCar?: number
): ComplianceCounts {
  const vehicleLabelById = new Map<string, string>();
  for (const v of vehicles) {
    const id = v.vehicle_id || v.id;
    if (!id) continue;
    vehicleLabelById.set(id, v.license_plate || v.plate || `Vehicle ${id.slice(0, 8)}`);
  }

  const byKey = new Map<string, VehicleDocument>();
  for (const doc of vehicleDocuments) {
    byKey.set(`${doc.vehicle_id}:${doc.document_type}`, doc);
  }

  const rows: ComplianceDocRow[] = [];

  if (vehicles.length === 0) {
    return { rows: [], approved: 0, pending: 0, missing: 0, expired: 0, rejected: 0 };
  }

  for (const v of vehicles) {
    const vid = v.vehicle_id || v.id;
    if (!vid) continue;
    const vLabel = vehicleLabelById.get(vid) || "Vehicle";

    for (const type of REQUIRED_VEHICLE_PAPER_TYPES) {
      const doc = byKey.get(`${vid}:${type}`);
      rows.push({
        key: `vehicle-${vid}-${type}`,
        label: VEHICLE_PAPER_LABELS[type] || type,
        status: docStatus(doc),
        expiryDate: doc?.expiry_date,
        entity: "vehicle",
        vehicleLabel: vLabel,
        kind: "paper",
      });
    }

    for (const type of REQUIRED_VEHICLE_PHOTO_TYPES) {
      const doc = byKey.get(`${vid}:${type}`);
      rows.push({
        key: `vehicle-${vid}-${type}`,
        label: VEHICLE_PHOTO_LABELS[type] || type,
        status: docStatus(doc),
        expiryDate: doc?.expiry_date,
        entity: "vehicle",
        vehicleLabel: vLabel,
        optional: true,
        kind: "photo",
      });
    }

    const optional = byKey.get(`${vid}:hire_agreement`);
    if (optional) {
      rows.push({
        key: `vehicle-${vid}-hire_agreement`,
        label: VEHICLE_DOC_LABELS.hire_agreement,
        status: docStatus(optional),
        expiryDate: optional.expiry_date,
        entity: "vehicle",
        vehicleLabel: vLabel,
        optional: true,
        kind: "paper",
      });
    }
  }

  return countComplianceRows(rows);
}

export type DocumentsOverviewSummary = {
  totalRequired: number;
  approved: number;
  pending: number;
  missing: number;
  expired: number;
  rejected: number;
  driverRequired: number;
  vehiclePaperRequired: number;
  vehiclePhotoRequired: number;
  vehicles: number;
  /** True when every required slot is either approved or pending (nothing missing/rejected/expired) */
  readyToReview: boolean;
  /** True when every required slot is approved and none expired */
  readyToApprove: boolean;
};

/**
 * Overview for Pending Review: driver docs + car papers + car photos.
 * Pending uploads count as "In review", not "Missing".
 *
 * Activation package assumes at least 1 vehicle (6 driver + 4 car papers = 10).
 * Vehicle photos are optional until the driver app supports them.
 * hire_agreement is optional and never included in totals.
 */
export function buildDocumentsOverviewSummary(
  driver: Driver,
  driverDocuments: DriverDocument[],
  vehicleDocuments: VehicleDocument[],
  vehicles: { id?: string; vehicle_id?: string; license_plate?: string; plate?: string }[]
): DocumentsOverviewSummary {
  const driverRows = buildDriverComplianceRows(driverDocuments);
  const vehicleRows = buildVehicleComplianceRows(vehicleDocuments, vehicles);

  const vehiclesCount = vehicles.length;
  /** At least 1 car is required to activate a driver */
  const vehiclesForRequirement = Math.max(vehiclesCount, 1);

  const driverRequired = REQUIRED_DRIVER_DOC_TYPES.length;
  const vehiclePaperRequired =
    REQUIRED_VEHICLE_PAPER_TYPES.length * vehiclesForRequirement;
  /** Photos shown in UI but not required for activation totals */
  const vehiclePhotoRequired = 0;
  const totalRequired = driverRequired + vehiclePaperRequired;

  const approved = driverRows.approved + vehicleRows.approved;
  const pending = driverRows.pending + vehicleRows.pending;
  const expired = driverRows.expired + vehicleRows.expired;
  const rejected = driverRows.rejected + vehicleRows.rejected;

  // When no vehicle exists, required car paper slots are missing
  const vehicleSlotsMissingWhenNoCar =
    vehiclesCount === 0 ? REQUIRED_VEHICLE_PAPER_TYPES.length : 0;

  const missing =
    driverRows.missing + vehicleRows.missing + vehicleSlotsMissingWhenNoCar;

  return {
    totalRequired,
    approved,
    pending,
    missing,
    expired,
    rejected,
    driverRequired,
    vehiclePaperRequired,
    vehiclePhotoRequired,
    vehicles: vehiclesCount,
    readyToReview:
      vehiclesCount > 0 &&
      totalRequired > 0 &&
      missing === 0 &&
      rejected === 0 &&
      expired === 0,
    readyToApprove:
      vehiclesCount > 0 &&
      totalRequired > 0 &&
      approved === totalRequired &&
      expired === 0,
  };
}

export function getDriverComplianceBreakdown(driver: Driver) {
  const driverApproved = driver.approved_driver_docs ?? 0;
  const driverRequired = driver.driver_required_docs ?? REQUIRED_DRIVER_DOC_TYPES.length;
  const driverExpired = driver.expired_driver_docs ?? 0;
  const vehicleApproved = driver.approved_vehicle_docs ?? 0;
  const perVehicle =
    driver.vehicle_required_docs ?? REQUIRED_VEHICLE_DOC_TYPES.length;
  const vehicleRequired = perVehicle * Math.max(driver.total_vehicles ?? 0, 0);
  const vehicleExpired = driver.expired_vehicle_docs ?? 0;

  return {
    driver: {
      required: driverRequired,
      approved: driverApproved,
      expired: driverExpired,
      // View only knows approved; remaining may be pending or missing
      incomplete: Math.max(0, driverRequired - driverApproved),
      missing: Math.max(0, driverRequired - driverApproved),
    },
    vehicle: {
      required: vehicleRequired,
      approved: vehicleApproved,
      expired: vehicleExpired,
      incomplete: Math.max(0, vehicleRequired - vehicleApproved),
      missing: Math.max(0, vehicleRequired - vehicleApproved),
      perVehicle,
      vehicles: driver.total_vehicles ?? 0,
      papersPerVehicle: REQUIRED_VEHICLE_PAPER_TYPES.length,
      photosPerVehicle: REQUIRED_VEHICLE_PHOTO_TYPES.length,
    },
    total: {
      required: driver.total_required_docs ?? driverRequired + vehicleRequired,
      approved: driver.total_approved_docs ?? driverApproved + vehicleApproved,
    },
  };
}
