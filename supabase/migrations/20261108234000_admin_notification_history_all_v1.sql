-- Full driver-related notification history (not only admin messages),
-- with Updates/Documents sections matching driver inbox rules.

CREATE OR REPLACE VIEW public.admin_communications_send_history_v1 AS
SELECT
  ne.id,
  ne.organization_id,
  ne.driver_id,
  COALESCE(
    NULLIF(TRIM(CONCAT(COALESCE(d.first_name, ''), ' ', COALESCE(d.last_name, ''))), ''),
    d.email,
    'All / unscoped'
  ) AS driver_name,
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
    ne.event_type
  ) AS inbox_type,
  CASE
    WHEN COALESCE(ne.payload->>'section', '') = 'documents' THEN 'documents'
    WHEN COALESCE(ne.payload->>'category', '') = 'documents' THEN 'documents'
    WHEN COALESCE(ne.payload->>'inbox_type', '') LIKE 'document_%' THEN 'documents'
    WHEN ne.event_type ILIKE '%doc%' THEN 'documents'
    ELSE 'updates'
  END AS section,
  COALESCE(ne.guardrail_result->>'last_failure_reason', ne.dead_letter_reason) AS failure_reason
FROM public.notification_events ne
LEFT JOIN public.drivers d ON d.id = ne.driver_id
WHERE ne.driver_id IS NOT NULL
   OR ne.event_type ILIKE 'admin_%'
   OR ne.source_module ILIKE 'admin%';

GRANT SELECT ON public.admin_communications_send_history_v1 TO authenticated;
GRANT SELECT ON public.admin_communications_send_history_v1 TO service_role;
