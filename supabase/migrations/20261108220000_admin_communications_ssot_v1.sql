-- Admin Communications SSOT: automation rules + read views for notifications / help / doc expiry.
-- UI and APIs must read from these views; writes go to notification_events + notification_automation_rules.

CREATE TABLE IF NOT EXISTS public.notification_automation_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  rule_key text NOT NULL,
  category text NOT NULL CHECK (category IN ('system', 'documents', 'jobs')),
  title text NOT NULL,
  description text,
  enabled boolean NOT NULL DEFAULT false,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, rule_key)
);

CREATE INDEX IF NOT EXISTS idx_notification_automation_rules_org
  ON public.notification_automation_rules (organization_id, enabled);

ALTER TABLE public.notification_automation_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS notification_automation_rules_service ON public.notification_automation_rules;
CREATE POLICY notification_automation_rules_service
  ON public.notification_automation_rules
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE ON public.notification_automation_rules TO authenticated;
GRANT ALL ON public.notification_automation_rules TO service_role;

-- Seed default automation presets per org (idempotent)
INSERT INTO public.notification_automation_rules (
  organization_id, rule_key, category, title, description, enabled, config
)
SELECT
  o.id,
  v.rule_key,
  v.category,
  v.title,
  v.description,
  false,
  v.config::jsonb
FROM public.organizations o
CROSS JOIN (
  VALUES
    (
      'doc_expiry_reminders',
      'documents',
      'Document expiry reminders',
      'Push drivers when required docs expire in 30 / 14 / 7 days',
      '{"days_before":[30,14,7],"channels":["push"]}'
    ),
    (
      'job_reminder_before_pickup',
      'jobs',
      'Job reminder before pickup',
      'Remind assigned drivers before scheduled pickup',
      '{"minutes_before":[120,30],"channels":["push"]}'
    ),
    (
      'system_maintenance_broadcast',
      'system',
      'System / ops broadcasts',
      'Manual or scheduled system messages (app updates, maintenance)',
      '{"channels":["push"]}'
    )
) AS v(rule_key, category, title, description, config)
ON CONFLICT (organization_id, rule_key) DO NOTHING;

CREATE OR REPLACE VIEW public.admin_driver_notification_feed_v1 AS
SELECT
  ne.id,
  ne.organization_id,
  ne.event_type,
  ne.source_module,
  ne.priority,
  ne.status,
  ne.occurred_at,
  ne.created_at,
  ne.driver_id,
  ne.booking_id,
  ne.job_id,
  ne.is_urgent,
  ne.payload,
  COALESCE(
    NULLIF(TRIM(CONCAT(COALESCE(d.first_name, ''), ' ', COALESCE(d.last_name, ''))), ''),
    d.email,
    'All / unscoped'
  ) AS driver_name,
  d.email AS driver_email,
  COALESCE(ne.payload->>'category',
    CASE
      WHEN ne.event_type ILIKE '%doc%' THEN 'documents'
      WHEN ne.event_type ILIKE '%job%' OR ne.event_type ILIKE '%booking%' THEN 'jobs'
      ELSE 'system'
    END
  ) AS category,
  COALESCE(ne.payload->>'push_title', ne.event_type) AS title,
  COALESCE(ne.payload->>'push_body', ne.payload->>'message', '') AS body
FROM public.notification_events ne
LEFT JOIN public.drivers d ON d.id = ne.driver_id
WHERE ne.driver_id IS NOT NULL
   OR ne.event_type ILIKE 'admin_%'
   OR ne.source_module ILIKE 'admin%';

GRANT SELECT ON public.admin_driver_notification_feed_v1 TO authenticated;
GRANT SELECT ON public.admin_driver_notification_feed_v1 TO service_role;

CREATE OR REPLACE VIEW public.admin_doc_expiry_candidates_v1 AS
WITH docs AS (
  SELECT
    d.organization_id,
    d.id AS driver_id,
    CONCAT(COALESCE(d.first_name, ''), ' ', COALESCE(d.last_name, '')) AS driver_name,
    d.email AS driver_email,
    dd.id AS document_id,
    'driver'::text AS entity_type,
    dd.document_type,
    dd.expiry_date,
    dd.status AS document_status,
    NULL::uuid AS vehicle_id,
    NULL::text AS license_plate
  FROM public.drivers d
  JOIN public.driver_documents dd ON dd.driver_id = d.id
  WHERE d.deleted_at IS NULL
    AND dd.expiry_date IS NOT NULL
    AND dd.status = 'approved'

  UNION ALL

  SELECT
    d.organization_id,
    d.id AS driver_id,
    CONCAT(COALESCE(d.first_name, ''), ' ', COALESCE(d.last_name, '')) AS driver_name,
    d.email AS driver_email,
    vd.id AS document_id,
    'vehicle'::text AS entity_type,
    vd.document_type,
    vd.expiry_date,
    vd.status AS document_status,
    v.id AS vehicle_id,
    v.license_plate
  FROM public.drivers d
  JOIN public.vehicles v ON v.driver_id = d.id AND v.deleted_at IS NULL
  JOIN public.vehicle_documents vd ON vd.vehicle_id = v.id
  WHERE d.deleted_at IS NULL
    AND vd.expiry_date IS NOT NULL
    AND vd.status = 'approved'
)
SELECT
  organization_id,
  driver_id,
  TRIM(driver_name) AS driver_name,
  driver_email,
  document_id,
  entity_type,
  document_type,
  expiry_date,
  document_status,
  vehicle_id,
  license_plate,
  (expiry_date - CURRENT_DATE) AS days_until_expiry
FROM docs
WHERE expiry_date BETWEEN CURRENT_DATE AND (CURRENT_DATE + 30);

GRANT SELECT ON public.admin_doc_expiry_candidates_v1 TO authenticated;
GRANT SELECT ON public.admin_doc_expiry_candidates_v1 TO service_role;

CREATE OR REPLACE VIEW public.admin_driver_help_sessions_v1 AS
SELECT
  s.id,
  s.organization_id,
  s.driver_id,
  TRIM(CONCAT(COALESCE(d.first_name, ''), ' ', COALESCE(d.last_name, ''))) AS driver_name,
  d.email AS driver_email,
  d.phone AS driver_phone,
  s.topic,
  s.status,
  s.started_at,
  s.closed_at,
  s.updated_at,
  (
    SELECT COUNT(*)::int
    FROM public.live_chat_messages m
    WHERE m.session_id = s.id
  ) AS message_count,
  (
    SELECT m.message
    FROM public.live_chat_messages m
    WHERE m.session_id = s.id
    ORDER BY m.created_at DESC
    LIMIT 1
  ) AS last_message_preview
FROM public.live_chat_sessions s
LEFT JOIN public.drivers d ON d.id = s.driver_id;

GRANT SELECT ON public.admin_driver_help_sessions_v1 TO authenticated;
GRANT SELECT ON public.admin_driver_help_sessions_v1 TO service_role;
