// ============================================================================
// DRIVERS TYPES - STRICT CONTRACT WITH BACKEND
// ============================================================================
// Based on: admin_drivers_list_v4 (SINGLE SOURCE OF TRUTH)
// DO NOT modify without updating corresponding view

export type Driver = {
  // Identity
  id: string;
  organization_id: string;
  first_name: string;
  last_name: string;
  full_name?: string; // computed for backward compatibility
  email: string | null;
  phone: string | null;
  profile_photo_url: string | null;
  profile_photo_status?: "pending" | "approved" | "rejected" | null;
  profile_photo_reviewed_by?: string | null;
  profile_photo_reviewed_at?: string | null;
  profile_photo_rejection_reason?: string | null;
  created_at: string;
  updated_at: string;

  // Status
  status: string; // pending, approved, suspended, inactive
  status_reason?: string | null; // reason for suspend/inactive
  status_changed_at?: string | null; // when status last changed
  online_status: string;
  is_active: boolean;
  is_approved: boolean;
  is_available: boolean;
  onboarding_status: string;

  // Rating
  rating_average: number | null;
  rating_count: number;

  // Vehicles
  total_vehicles: number;

  // Documents (from view - NO calculations)
  approved_driver_docs: number;
  expired_driver_docs: number;
  approved_vehicle_docs: number;
  expired_vehicle_docs: number;
  driver_required_docs: number;
  vehicle_required_docs: number;
  total_required_docs: number;
  total_approved_docs: number;

  // Backward compatibility fields (computed from v4 data)
  documents_required?: number; // alias for total_required_docs
  documents_completed?: number; // alias for total_approved_docs
  documents_expired?: number; // computed: expired_driver_docs + expired_vehicle_docs
  documents_expiring_soon?: number; // 1 dacă are doc. care expiră în ≤30 zile
  member_since?: string; // alias for created_at

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
