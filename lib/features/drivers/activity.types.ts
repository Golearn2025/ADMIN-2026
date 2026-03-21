// ============================================================================
// ACTIVITY LOG TYPES - Contract with admin_driver_activity_v1
// ============================================================================

export type ActivityLog = {
  id: string;
  organization_id: string;
  driver_id: string;
  activity_type: "document_status" | "driver_status" | "profile_photo_change";
  entity_type: "driver" | "vehicle";
  entity_id: string;
  entity_name: string;
  old_status: string | null;
  new_status: string | null;
  reason: string | null;
  performed_by: string;
  performed_by_email: string;
  performed_by_name: string;
  created_at: string;
};

export type ActivityLogGroup = {
  date: string;
  logs: ActivityLog[];
};
