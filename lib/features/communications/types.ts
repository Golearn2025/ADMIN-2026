/** Same sections as driver NotificationsScreen */
export type InboxSection = "updates" | "documents";

export const DOCUMENT_INBOX_TYPES = [
  "document_approved",
  "document_rejected",
  "document_expired",
  "document_required",
] as const;

export const UPDATES_INBOX_TYPES = [
  "admin_message",
  "app_update",
  "announcement",
  "account_approved",
  "account_rejected",
  "system",
] as const;

export type DocumentInboxType = (typeof DOCUMENT_INBOX_TYPES)[number];
export type UpdatesInboxType = (typeof UPDATES_INBOX_TYPES)[number];
export type InboxNotificationType = DocumentInboxType | UpdatesInboxType;

export const INBOX_SECTIONS: Array<{
  id: InboxSection;
  label: string;
  description: string;
  driverTab: string;
}> = [
  {
    id: "updates",
    label: "Updates",
    description: "Ops messages, announcements, app updates",
    driverTab: "Notifications → Updates",
  },
  {
    id: "documents",
    label: "Documents",
    description: "Approved / rejected / expired / required docs",
    driverTab: "Notifications → Documents",
  },
];

export const UPDATES_TYPE_OPTIONS: Array<{
  id: UpdatesInboxType;
  label: string;
}> = [
  { id: "admin_message", label: "Admin message" },
  { id: "app_update", label: "App update" },
  { id: "announcement", label: "Announcement" },
];

export const DOCUMENTS_TYPE_OPTIONS: Array<{
  id: DocumentInboxType;
  label: string;
}> = [
  { id: "document_required", label: "Document required" },
  { id: "document_approved", label: "Document approved" },
  { id: "document_rejected", label: "Document rejected" },
  { id: "document_expired", label: "Document expired" },
];

export function sectionForInboxType(type: string): InboxSection {
  if ((DOCUMENT_INBOX_TYPES as readonly string[]).includes(type)) return "documents";
  return "updates";
}

/** @deprecated keep for automations table until jobs cron lands */
export type NotificationCategory = "system" | "documents" | "jobs";

export type DriverInboxFeedRow = {
  id: string;
  organization_id: string;
  driver_id: string;
  user_id: string;
  driver_name: string | null;
  driver_email: string | null;
  title: string;
  body: string;
  type: string;
  section: InboxSection | string;
  read_at: string | null;
  created_at: string;
  is_system: boolean | null;
  priority: string | null;
};

/** Admin send ledger — includes push delivery status */
export type CommunicationsSendHistoryRow = {
  id: string;
  organization_id: string;
  driver_id: string | null;
  driver_name: string | null;
  driver_email: string | null;
  event_type: string;
  source_module: string | null;
  status: string;
  occurred_at: string;
  created_at: string;
  failed_at: string | null;
  title: string;
  body: string;
  inbox_type: string;
  section: InboxSection | string;
  failure_reason: string | null;
  guardrail_result?: Record<string, unknown> | null;
};

/** @deprecated use CommunicationsSendHistoryRow */
export type DriverNotificationFeedRow = CommunicationsSendHistoryRow;

export type AutomationRule = {
  id: string;
  organization_id: string;
  rule_key: string;
  category: NotificationCategory;
  title: string;
  description: string | null;
  enabled: boolean;
  config: Record<string, unknown>;
  updated_at: string;
};

export type DocExpiryCandidate = {
  organization_id: string;
  driver_id: string;
  driver_name: string;
  driver_email: string | null;
  document_id: string;
  entity_type: "driver" | "vehicle";
  document_type: string;
  expiry_date: string;
  document_status: string;
  vehicle_id: string | null;
  license_plate: string | null;
  days_until_expiry: number;
};

export type HelpSessionRow = {
  id: string;
  organization_id: string;
  driver_id: string | null;
  driver_name: string | null;
  driver_email: string | null;
  driver_phone: string | null;
  topic: string | null;
  status: string;
  started_at: string;
  closed_at: string | null;
  updated_at: string;
  message_count: number;
  unread_count: number;
  last_message_preview: string | null;
  last_sender_type: string | null;
};

export type HelpMessageRow = {
  id: string;
  session_id: string;
  driver_id: string;
  sender_id: string | null;
  sender_type: "driver" | "operator" | "admin" | string;
  /** Denormalized at insert — industry chat label for both admin + driver UI */
  sender_display_name?: string | null;
  message: string;
  message_type: "text" | "image" | "system" | string;
  image_url: string | null;
  created_at: string;
  read_at: string | null;
};

export type DriverOption = {
  id: string;
  name: string;
  email: string | null;
  status: string | null;
  is_active: boolean | null;
};
