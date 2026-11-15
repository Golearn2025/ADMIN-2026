-- Prefer successful push delivery over stale failed_retryable + invalid_aliases noise.
-- OneSignal often returns invalid_aliases for users who still have a subscribed device.

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
  CASE
    WHEN ld.status IN ('provider_accepted', 'delivered', 'sent') THEN 'delivered'
    WHEN ne.status IN ('delivered', 'partially_delivered') THEN ne.status
    ELSE ne.status
  END AS status,
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
  CASE
    WHEN ld.status IN ('provider_accepted', 'delivered', 'sent') THEN NULL
    WHEN ne.status IN ('delivered', 'partially_delivered') THEN NULL
    WHEN ld.provider_message_id IS NOT NULL
      AND COALESCE(ne.guardrail_result->>'last_failure_reason', ne.dead_letter_reason, '')
          ILIKE '%invalid alias%'
      THEN NULL
    ELSE COALESCE(ne.guardrail_result->>'last_failure_reason', ne.dead_letter_reason)
  END AS failure_reason
FROM public.notification_events ne
LEFT JOIN public.drivers d ON d.id = ne.driver_id
LEFT JOIN LATERAL (
  SELECT
    nd.status,
    nd.provider_message_id
  FROM public.notification_deliveries nd
  WHERE nd.event_id = ne.id
    AND nd.channel = 'push'
  ORDER BY nd.updated_at DESC NULLS LAST, nd.created_at DESC
  LIMIT 1
) ld ON TRUE
WHERE ne.driver_id IS NOT NULL
   OR ne.event_type ILIKE 'admin_%'
   OR ne.source_module ILIKE 'admin%';

GRANT SELECT ON public.admin_communications_send_history_v1 TO authenticated;
GRANT SELECT ON public.admin_communications_send_history_v1 TO service_role;
