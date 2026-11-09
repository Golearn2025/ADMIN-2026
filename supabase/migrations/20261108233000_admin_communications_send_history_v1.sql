-- Delivery history for admin → driver sends (status: pending/delivered/failed…).
-- Sections match driver inbox: updates | documents.

CREATE OR REPLACE VIEW public.admin_communications_send_history_v1 AS
SELECT
  ne.id,
  ne.organization_id,
  ne.driver_id,
  TRIM(CONCAT(COALESCE(d.first_name, ''), ' ', COALESCE(d.last_name, ''))) AS driver_name,
  d.email AS driver_email,
  ne.event_type,
  ne.source_module,
  ne.status,
  ne.occurred_at,
  ne.created_at,
  ne.failed_at,
  ne.guardrail_result,
  COALESCE(ne.payload->>'push_title', ne.event_type) AS title,
  COALESCE(ne.payload->>'push_body', ne.payload->>'message', '') AS body,
  COALESCE(
    ne.payload->>'inbox_type',
    CASE
      WHEN ne.event_type = 'admin_driver_documents' THEN 'document_required'
      ELSE 'admin_message'
    END
  ) AS inbox_type,
  COALESCE(
    ne.payload->>'section',
    CASE
      WHEN ne.event_type = 'admin_driver_documents'
        OR COALESCE(ne.payload->>'inbox_type', '') LIKE 'document_%'
        OR COALESCE(ne.payload->>'category', '') = 'documents'
      THEN 'documents'
      ELSE 'updates'
    END
  ) AS section,
  COALESCE(ne.guardrail_result->>'last_failure_reason', ne.dead_letter_reason) AS failure_reason
FROM public.notification_events ne
LEFT JOIN public.drivers d ON d.id = ne.driver_id
WHERE ne.source_module = 'admin_communications'
   OR ne.event_type LIKE 'admin_driver_%';

GRANT SELECT ON public.admin_communications_send_history_v1 TO authenticated;
GRANT SELECT ON public.admin_communications_send_history_v1 TO service_role;
