-- Align automation configs: doc expiry 30/15/1 + job reminder 3h/1h + message templates.
-- Does NOT enable rules — all stay OFF until cron worker ships.

UPDATE public.notification_automation_rules
SET
  description = 'Push + Documents inbox when required docs expire in 30 / 15 / 1 days',
  config = '{
    "days_before": [30, 15, 1],
    "channels": ["push", "inbox"],
    "inbox_section": "documents",
    "templates": [
      {
        "days_before": 30,
        "inbox_type": "document_required",
        "title": "Document expires in 30 days",
        "body": "Your {document_label} expires in 30 days ({expiry_date}). Please renew it in Documents so you can keep receiving jobs."
      },
      {
        "days_before": 15,
        "inbox_type": "document_required",
        "title": "Document expires in 15 days",
        "body": "Your {document_label} expires in 15 days ({expiry_date}). Renew it now in Documents to avoid losing job access."
      },
      {
        "days_before": 1,
        "inbox_type": "document_required",
        "title": "Document expires tomorrow",
        "body": "Your {document_label} expires tomorrow ({expiry_date}). Upload a renewed document today or you will not be able to receive new jobs after it expires."
      }
    ]
  }'::jsonb,
  updated_at = now()
WHERE rule_key = 'doc_expiry_reminders';

UPDATE public.notification_automation_rules
SET
  description = 'Remind assigned drivers 3 hours and 1 hour before pickup (opens Accepted)',
  config = '{
    "minutes_before": [180, 60],
    "channels": ["push", "inbox"],
    "inbox_section": "updates",
    "deep_link": "accepted",
    "templates": [
      {
        "minutes_before": 180,
        "inbox_type": "admin_message",
        "title": "Job in 3 hours",
        "body": "Your accepted job starts in about 3 hours ({pickup_time}). Open Accepted to review the trip details.",
        "deep_link": "accepted"
      },
      {
        "minutes_before": 60,
        "inbox_type": "admin_message",
        "title": "Job in 1 hour",
        "body": "Your accepted job starts in about 1 hour ({pickup_time}). Open Accepted to get ready for pickup.",
        "deep_link": "accepted"
      }
    ]
  }'::jsonb,
  updated_at = now()
WHERE rule_key = 'job_reminder_before_pickup';
