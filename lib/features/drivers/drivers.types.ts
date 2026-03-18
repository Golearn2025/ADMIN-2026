// ============================================================================
// DRIVERS TYPES - STRICT CONTRACT WITH BACKEND
// ============================================================================
// Based on: admin_drivers_list_v3, driver_documents, vehicle_documents, document_status_logs
// DO NOT modify without updating corresponding views

export type Driver = {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string;
  organization_id: string;

  is_active: boolean;
  is_approved: boolean;

  onboarding_status: "draft" | "review" | "complete";

  total_vehicles: number;

  total_driver_docs: number;
  expired_driver_docs: number;
  pending_driver_docs: number;

  total_vehicle_docs: number;
  expired_vehicle_docs: number;
  pending_vehicle_docs: number;

  missing_driver_docs: number;
  missing_vehicle_docs: number;

  compliance_status:
    | "ok"
    | "pending"
    | "missing_driver_docs"
    | "missing_vehicle_docs"
    | "expired";

  can_receive_jobs: boolean;
};

export type DriverDocument = {
  id: string;
  driver_id: string;
  document_type: string;
  document_category: "driver" | "vehicle";
  status: "pending" | "approved" | "rejected" | "expired";
  expiry_date: string | null;
  upload_date: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  rejection_reason: string | null;
  file_url: string | null;
  file_name: string | null;
};

export type VehicleDocument = {
  id: string;
  vehicle_id: string;
  document_type: string;
  status: "pending" | "approved" | "rejected" | "expired";
  expiry_date: string | null;
  upload_date: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  rejection_reason: string | null;
  file_url: string | null;
  file_name: string | null;
};

export type DocumentStatusLog = {
  id: string;
  organization_id: string;
  document_id: string;
  entity_type: "driver_document" | "vehicle_document";
  old_status: string;
  new_status: string;
  changed_by: string | null;
  reason: string | null;
  created_at: string;
};

export type DriverWithDocuments = Driver & {
  driver_documents: DriverDocument[];
  vehicle_documents: VehicleDocument[];
};

// UI State types
export type DriverFilter = {
  search: string;
  compliance_status: string[];
  onboarding_status: string[];
  is_approved: boolean | null;
};

export type DocumentAction = "approve" | "reject";

export type DocumentUpdatePayload = {
  id: string;
  status: "approved" | "rejected";
  reviewed_by: string;
  rejection_reason?: string;
};
