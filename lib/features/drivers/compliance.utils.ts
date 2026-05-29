import type { Driver, DriverDocument, VehicleDocument } from "./drivers.types";

export const DRIVER_DOC_LABELS: Record<string, string> = {
  driving_licence: "Driving Licence",
  electronic_counterpart: "Electronic Counterpart",
  pco_licence: "PCO Licence",
  bank_statement: "Bank Statement",
  proof_of_identity: "Proof of Identity",
  proof_of_address: "Proof of Address",
};

export const VEHICLE_DOC_LABELS: Record<string, string> = {
  phv_licence: "PHV Licence",
  mot_certificate: "MOT Certificate",
  insurance_certificate: "Insurance Certificate",
  v5c_logbook: "V5C Logbook",
  hire_agreement: "Hire Agreement (optional)",
};

export type ComplianceDocRow = {
  key: string;
  label: string;
  status: "approved" | "pending" | "rejected" | "expired" | "missing";
  expiryDate?: string | null;
  entity: "driver" | "vehicle";
  vehicleLabel?: string;
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

export function buildDriverComplianceRows(
  driverDocuments: DriverDocument[],
  requiredCount: number
): { rows: ComplianceDocRow[]; approved: number; missing: number; expired: number } {
  const byType = new Map(driverDocuments.map((d) => [d.document_type, d]));
  const types = Object.keys(DRIVER_DOC_LABELS);

  const rows: ComplianceDocRow[] = types.map((type) => {
    const doc = byType.get(type);
    return {
      key: `driver-${type}`,
      label: DRIVER_DOC_LABELS[type] || type.replace(/_/g, " "),
      status: docStatus(doc),
      expiryDate: doc?.expiry_date,
      entity: "driver",
    };
  });

  let approved = 0;
  let missing = 0;
  let expired = 0;
  for (const row of rows) {
    if (row.status === "approved") approved++;
    else if (row.status === "expired") expired++;
    else if (row.status === "missing" || row.status === "rejected") missing++;
  }

  return { rows, approved, missing, expired };
}

export function buildVehicleComplianceRows(
  vehicleDocuments: VehicleDocument[],
  vehicles: { id?: string; vehicle_id?: string; license_plate?: string; plate?: string }[],
  vehicleRequiredPerCar: number
): { rows: ComplianceDocRow[]; approved: number; missing: number; expired: number } {
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

  const requiredTypes = Object.keys(VEHICLE_DOC_LABELS).filter(
    (t) => t !== "hire_agreement"
  );

  const rows: ComplianceDocRow[] = [];

  if (vehicles.length === 0) {
    return { rows: [], approved: 0, missing: vehicleRequiredPerCar > 0 ? 1 : 0, expired: 0 };
  }

  for (const v of vehicles) {
    const vid = v.vehicle_id || v.id;
    if (!vid) continue;
    const vLabel = vehicleLabelById.get(vid) || "Vehicle";

    for (const type of requiredTypes) {
      const doc = byKey.get(`${vid}:${type}`);
      rows.push({
        key: `vehicle-${vid}-${type}`,
        label: VEHICLE_DOC_LABELS[type] || type,
        status: docStatus(doc),
        expiryDate: doc?.expiry_date,
        entity: "vehicle",
        vehicleLabel: vLabel,
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
      });
    }
  }

  let approved = 0;
  let missing = 0;
  let expired = 0;
  for (const row of rows) {
    if (row.status === "approved") approved++;
    else if (row.status === "expired") expired++;
    else if (row.status === "missing" || row.status === "rejected") missing++;
  }

  return { rows, approved, missing, expired };
}

export function getDriverComplianceBreakdown(driver: Driver) {
  const driverApproved = driver.approved_driver_docs ?? 0;
  const driverRequired = driver.driver_required_docs ?? 6;
  const driverExpired = driver.expired_driver_docs ?? 0;
  const vehicleApproved = driver.approved_vehicle_docs ?? 0;
  const vehicleRequired =
    (driver.vehicle_required_docs ?? 4) * Math.max(driver.total_vehicles ?? 0, 0);
  const vehicleExpired = driver.expired_vehicle_docs ?? 0;

  return {
    driver: {
      required: driverRequired,
      approved: driverApproved,
      expired: driverExpired,
      missing: Math.max(0, driverRequired - driverApproved),
    },
    vehicle: {
      required: vehicleRequired,
      approved: vehicleApproved,
      expired: vehicleExpired,
      missing: Math.max(0, vehicleRequired - vehicleApproved),
      perVehicle: driver.vehicle_required_docs ?? 4,
      vehicles: driver.total_vehicles ?? 0,
    },
    total: {
      required: driver.total_required_docs ?? driverRequired + vehicleRequired,
      approved: driver.total_approved_docs ?? driverApproved + vehicleApproved,
    },
  };
}
