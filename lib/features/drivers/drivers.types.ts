// ============================================================================
// DRIVERS TYPES - STRICT CONTRACT WITH BACKEND
// ============================================================================
// Based on: admin_driver_overview_v2 (SINGLE SOURCE OF TRUTH)
// DO NOT modify without updating corresponding view

export type Driver = {
  // Identity
  id: string;
  organization_id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  profile_photo_url: string | null;
  member_since: string;

  // Status
  status: string; // pending, approved, suspended, inactive
  online_status: string;
  is_active: boolean;
  is_approved: boolean;
  onboarding_status: string;
  driver_status: string;

  // Vehicles
  total_vehicles: number;

  // Documents (from view - NO calculations)
  documents_required: number;
  documents_completed: number;
  documents_expired: number;

  // Compliance (from view - NO derivation)
  compliance_status: "ok" | "missing" | "no_vehicle" | "expired";
  can_receive_jobs: boolean;
};

export type DriverDocument = {
  id: string;
  driver_id: string;
  document_type: string;
  document_category: "driver" | "vehicle";
  status: "pending" | "approved" | "rejected" | "expired";
  expiry_date: string | null;
  created_at: string;
  uploaded_at?: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  reviewed_by_name?: string | null;
  reviewed_by_email?: string | null;
  reviewed_by_role?: string | null;
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
  created_at: string;
  uploaded_at?: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  reviewed_by_name?: string | null;
  reviewed_by_email?: string | null;
  reviewed_by_role?: string | null;
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
