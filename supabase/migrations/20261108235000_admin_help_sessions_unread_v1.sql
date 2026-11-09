DROP VIEW IF EXISTS public.admin_driver_help_sessions_v1;

CREATE VIEW public.admin_driver_help_sessions_v1 AS
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
    SELECT COUNT(*)::int
    FROM public.live_chat_messages m
    WHERE m.session_id = s.id
      AND m.sender_type = 'driver'
      AND m.read_at IS NULL
  ) AS unread_count,
  (
    SELECT m.message
    FROM public.live_chat_messages m
    WHERE m.session_id = s.id
    ORDER BY m.created_at DESC
    LIMIT 1
  ) AS last_message_preview,
  (
    SELECT m.sender_type
    FROM public.live_chat_messages m
    WHERE m.session_id = s.id
    ORDER BY m.created_at DESC
    LIMIT 1
  ) AS last_sender_type
FROM public.live_chat_sessions s
LEFT JOIN public.drivers d ON d.id = s.driver_id;

GRANT SELECT ON public.admin_driver_help_sessions_v1 TO authenticated;
GRANT SELECT ON public.admin_driver_help_sessions_v1 TO service_role;
