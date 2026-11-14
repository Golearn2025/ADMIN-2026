/**
 * SSOT message formats for Communications → Automations.
 * Workers interpolate {placeholders}; admin UI previews samples.
 * Rules stay OFF until cron is live — templates alone do not send push.
 */

export const DOC_EXPIRY_DAYS = [30, 15, 1] as const;
export const JOB_REMINDER_MINUTES = [180, 60] as const; // 3h + 1h

/** Human labels for driver/vehicle document_type keys */
export const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  driving_licence: "Driving licence",
  proof_of_identity: "Proof of identity",
  pco_licence: "PCO licence",
  electronic_counterpart: "Electronic counterpart",
  insurance_certificate: "Insurance certificate",
  mot_certificate: "MOT certificate",
  phv_licence: "PHV licence",
  hire_agreement: "Hire agreement",
  vehicle_logbook: "Vehicle logbook",
  public_liability_insurance: "Public liability insurance",
};

export function labelDocumentType(documentType: string): string {
  if (DOCUMENT_TYPE_LABELS[documentType]) {
    return DOCUMENT_TYPE_LABELS[documentType];
  }
  return documentType
    .split("_")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export type DocExpiryMessageTemplate = {
  days_before: number;
  /** Driver Notifications → Documents */
  inbox_type: "document_required" | "document_expired";
  title: string;
  body: string;
};

export type JobReminderMessageTemplate = {
  minutes_before: number;
  /** Updates inbox until a dedicated jobs tab exists; deep-link opens Accepted */
  inbox_type: "admin_message";
  title: string;
  body: string;
  deep_link: "accepted";
};

/** Placeholders: {document_label} {days} {expiry_date} {entity} {plate} */
export const DOC_EXPIRY_TEMPLATES: DocExpiryMessageTemplate[] = [
  {
    days_before: 30,
    inbox_type: "document_required",
    title: "Document expires in 30 days",
    body: "Your {document_label} expires in 30 days ({expiry_date}). Please renew it in Documents so you can keep receiving jobs.",
  },
  {
    days_before: 15,
    inbox_type: "document_required",
    title: "Document expires in 15 days",
    body: "Your {document_label} expires in 15 days ({expiry_date}). Renew it now in Documents to avoid losing job access.",
  },
  {
    days_before: 1,
    inbox_type: "document_required",
    title: "Document expires tomorrow",
    body: "Your {document_label} expires tomorrow ({expiry_date}). Upload a renewed document today or you will not be able to receive new jobs after it expires.",
  },
];

/** Placeholders: {hours} {pickup_time} {from_short} {to_short} {job_ref} */
export const JOB_REMINDER_TEMPLATES: JobReminderMessageTemplate[] = [
  {
    minutes_before: 180,
    inbox_type: "admin_message",
    title: "Pickup in 3 hours",
    body: "{pickup_time} · {from_short} → {to_short}",
    deep_link: "accepted",
  },
  {
    minutes_before: 60,
    inbox_type: "admin_message",
    title: "Pickup in 1 hour",
    body: "Time to head out · {pickup_time} · {from_short} → {to_short}",
    deep_link: "accepted",
  },
];

/** Account / compliance status — P1 industry must-haves */
export const ACCOUNT_STATUS_TEMPLATES = {
  approved: {
    inbox_type: "account_approved" as const,
    title: "You're approved",
    body: "Your Vantage Lane account is active. You can go online and receive jobs.",
  },
  rejected: {
    inbox_type: "account_rejected" as const,
    title: "Application not approved",
    body: "Your application was not approved. Check Documents or message Support for next steps.",
  },
  suspended: {
    inbox_type: "system" as const,
    title: "Account suspended",
    body: "Your account is suspended and you cannot receive new jobs. Contact Support if you need help.",
  },
  reactivated: {
    inbox_type: "system" as const,
    title: "Account reactivated",
    body: "Your account is active again. You can receive jobs.",
  },
  document_expired_blocked: {
    inbox_type: "document_expired" as const,
    title: "Document expired",
    body: "Your {document_label} has expired. Renew it in Documents — you cannot receive new jobs until it is approved.",
  },
} as const;

export function buildDocExpiryConfig() {
  return {
    days_before: [...DOC_EXPIRY_DAYS],
    channels: ["push", "inbox"] as const,
    inbox_section: "documents" as const,
    templates: DOC_EXPIRY_TEMPLATES,
  };
}

export function buildJobReminderConfig() {
  return {
    minutes_before: [...JOB_REMINDER_MINUTES],
    channels: ["push", "inbox"] as const,
    inbox_section: "updates" as const,
    deep_link: "accepted" as const,
    templates: JOB_REMINDER_TEMPLATES,
  };
}

/** Preview sample for admin UI (no real driver data). */
export function sampleDocExpiryMessage(
  days: (typeof DOC_EXPIRY_DAYS)[number],
  documentType = "driving_licence"
): { title: string; body: string; inbox: string } {
  const t =
    DOC_EXPIRY_TEMPLATES.find((x) => x.days_before === days) ||
    DOC_EXPIRY_TEMPLATES[0];
  const label = labelDocumentType(documentType);
  const expiry = new Date();
  expiry.setDate(expiry.getDate() + days);
  const expiryStr = expiry.toISOString().slice(0, 10);
  return {
    title: t.title,
    body: t.body
      .replaceAll("{document_label}", label)
      .replaceAll("{days}", String(days))
      .replaceAll("{expiry_date}", expiryStr)
      .replaceAll("{entity}", "driver")
      .replaceAll("{plate}", ""),
    inbox: "Driver app → Notifications → Documents",
  };
}

export function sampleJobReminderMessage(
  minutes: (typeof JOB_REMINDER_MINUTES)[number]
): { title: string; body: string; inbox: string; opens: string } {
  const t =
    JOB_REMINDER_TEMPLATES.find((x) => x.minutes_before === minutes) ||
    JOB_REMINDER_TEMPLATES[0];
  const hours = minutes / 60;
  return {
    title: t.title,
    body: t.body
      .replaceAll("{hours}", String(hours))
      .replaceAll("{pickup_time}", "14:30")
      .replaceAll("{from_short}", "Heathrow T5")
      .replaceAll("{to_short}", "Mayfair")
      .replaceAll("{job_ref}", "JOB-1234"),
    inbox: "Driver app → Notifications → Updates",
    opens: "Accepted (job detail)",
  };
}

/** Mock / dry-run recipient — never spam real drivers in local tests */
export const AUTOMATION_TEST_DRIVER = {
  email: "test@vantage-lane.com",
  driverId: "1187555a-2e7a-4e06-9463-6c6ef8a9ddc9",
  organizationId: "9a5caade-4791-4860-93b5-12b1c4fa9830",
  authUserId: "6bccf7b2-4cef-40fe-8ba0-bd8a3f59d173",
  name: "Catalin Tomita",
} as const;

export function interpolateDocExpiryBody(
  days: number,
  opts: {
    documentType: string;
    expiryDate: string;
    entityType?: string;
    licensePlate?: string | null;
  }
): { title: string; body: string; inbox_type: string } {
  const t =
    DOC_EXPIRY_TEMPLATES.find((x) => x.days_before === days) ||
    DOC_EXPIRY_TEMPLATES[DOC_EXPIRY_TEMPLATES.length - 1];
  const label = labelDocumentType(opts.documentType);
  const plateBit =
    opts.licensePlate && opts.entityType === "vehicle"
      ? ` (${opts.licensePlate})`
      : "";
  return {
    title: t.title,
    body: t.body
      .replaceAll("{document_label}", `${label}${plateBit}`)
      .replaceAll("{days}", String(days))
      .replaceAll("{expiry_date}", opts.expiryDate)
      .replaceAll("{entity}", opts.entityType || "driver")
      .replaceAll("{plate}", opts.licensePlate || ""),
    inbox_type: t.inbox_type,
  };
}
