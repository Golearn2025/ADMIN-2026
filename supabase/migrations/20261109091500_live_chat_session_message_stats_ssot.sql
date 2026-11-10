-- Fast Messages inbox: denormalize message stats on live_chat_sessions (industry chat pattern).
-- View stays SSOT for admin UI but stops correlated subqueries per row.

ALTER TABLE public.live_chat_sessions
  ADD COLUMN IF NOT EXISTS message_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS unread_driver_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_message_preview text,
  ADD COLUMN IF NOT EXISTS last_sender_type text;

UPDATE public.live_chat_sessions s
SET
  message_count = COALESCE(x.message_count, 0),
  unread_driver_count = COALESCE(x.unread_driver_count, 0),
  last_message_preview = x.last_message_preview,
  last_sender_type = x.last_sender_type
FROM (
  SELECT
    m.session_id,
    COUNT(*)::int AS message_count,
    COUNT(*) FILTER (
      WHERE m.sender_type = 'driver' AND m.read_at IS NULL
    )::int AS unread_driver_count,
    (
      SELECT m2.message
      FROM public.live_chat_messages m2
      WHERE m2.session_id = m.session_id
      ORDER BY m2.created_at DESC
      LIMIT 1
    ) AS last_message_preview,
    (
      SELECT m2.sender_type
      FROM public.live_chat_messages m2
      WHERE m2.session_id = m.session_id
      ORDER BY m2.created_at DESC
      LIMIT 1
    ) AS last_sender_type
  FROM public.live_chat_messages m
  GROUP BY m.session_id
) x
WHERE s.id = x.session_id;

CREATE OR REPLACE FUNCTION public.live_chat_sessions_apply_message_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.live_chat_sessions
  SET
    message_count = message_count + 1,
    unread_driver_count = unread_driver_count
      + CASE
          WHEN NEW.sender_type = 'driver' AND NEW.read_at IS NULL THEN 1
          ELSE 0
        END,
    last_message_preview = LEFT(COALESCE(NEW.message, ''), 500),
    last_sender_type = NEW.sender_type,
    updated_at = now()
  WHERE id = NEW.session_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_live_chat_message_insert_stats ON public.live_chat_messages;
CREATE TRIGGER trg_live_chat_message_insert_stats
  AFTER INSERT ON public.live_chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.live_chat_sessions_apply_message_insert();

CREATE OR REPLACE FUNCTION public.live_chat_sessions_recompute_unread(p_session_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.live_chat_sessions s
  SET unread_driver_count = (
    SELECT COUNT(*)::int
    FROM public.live_chat_messages m
    WHERE m.session_id = p_session_id
      AND m.sender_type = 'driver'
      AND m.read_at IS NULL
  )
  WHERE s.id = p_session_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_help_unread_total(p_organization_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(SUM(unread_driver_count), 0)::integer
  FROM public.live_chat_sessions
  WHERE organization_id = p_organization_id
    AND status = 'active';
$$;

GRANT EXECUTE ON FUNCTION public.admin_help_unread_total(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_help_unread_total(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.live_chat_sessions_recompute_unread(uuid) TO service_role;

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
  s.message_count,
  s.unread_driver_count AS unread_count,
  s.last_message_preview,
  s.last_sender_type
FROM public.live_chat_sessions s
LEFT JOIN public.drivers d ON d.id = s.driver_id;

GRANT SELECT ON public.admin_driver_help_sessions_v1 TO authenticated;
GRANT SELECT ON public.admin_driver_help_sessions_v1 TO service_role;
