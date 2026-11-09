-- Admin inbox SSOT = same `notifications` rows the driver app reads.
-- Sections match driver NotificationsScreen: Updates | Documents.

CREATE OR REPLACE VIEW public.admin_driver_inbox_feed_v1 AS
SELECT
  n.id,
  d.organization_id,
  d.id AS driver_id,
  n.user_id,
  TRIM(CONCAT(COALESCE(d.first_name, ''), ' ', COALESCE(d.last_name, ''))) AS driver_name,
  d.email AS driver_email,
  n.title,
  COALESCE(n.message, '') AS body,
  n.type,
  CASE
    WHEN n.type IN (
      'document_approved',
      'document_rejected',
      'document_expired',
      'document_required'
    ) THEN 'documents'
    ELSE 'updates'
  END AS section,
  n.read_at,
  n.created_at,
  n.is_system,
  n.priority
FROM public.notifications n
JOIN public.drivers d
  ON d.auth_user_id = n.user_id
 AND d.deleted_at IS NULL
WHERE COALESCE(n.target_type, 'driver') = 'driver';

GRANT SELECT ON public.admin_driver_inbox_feed_v1 TO authenticated;
GRANT SELECT ON public.admin_driver_inbox_feed_v1 TO service_role;

-- Enqueue with explicit inbox type (matches driver tabs).
DROP FUNCTION IF EXISTS public.admin_enqueue_driver_notification(uuid, uuid, text, text, text, uuid);

CREATE OR REPLACE FUNCTION public.admin_enqueue_driver_notification(
  p_organization_id uuid,
  p_driver_id uuid,
  p_type text,
  p_title text,
  p_body text,
  p_actor_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_event_type text;
  v_auth_user_id uuid;
  v_event_id uuid;
  v_section text;
  v_category text;
  v_idempotency_key text;
  v_allowed text[] := ARRAY[
    'admin_message',
    'app_update',
    'announcement',
    'account_approved',
    'account_rejected',
    'system',
    'document_approved',
    'document_rejected',
    'document_expired',
    'document_required'
  ];
BEGIN
  IF NOT (p_type = ANY (v_allowed)) THEN
    RAISE EXCEPTION 'invalid inbox type: %', p_type;
  END IF;

  IF NULLIF(TRIM(p_title), '') IS NULL OR NULLIF(TRIM(p_body), '') IS NULL THEN
    RAISE EXCEPTION 'title and body are required';
  END IF;

  IF p_type IN (
    'document_approved',
    'document_rejected',
    'document_expired',
    'document_required'
  ) THEN
    v_section := 'documents';
    v_category := 'documents';
    v_event_type := 'admin_driver_documents';
  ELSE
    v_section := 'updates';
    v_category := 'system';
    v_event_type := 'admin_driver_system';
  END IF;

  SELECT d.auth_user_id
  INTO v_auth_user_id
  FROM public.drivers d
  WHERE d.id = p_driver_id
    AND d.organization_id = p_organization_id
    AND d.deleted_at IS NULL;

  IF v_auth_user_id IS NULL THEN
    RAISE EXCEPTION 'driver not found or missing auth_user_id';
  END IF;

  v_idempotency_key := format(
    'admin_inbox_%s:%s:%s:%s',
    p_type,
    p_organization_id,
    p_driver_id,
    gen_random_uuid()::text
  );

  INSERT INTO public.notification_events (
    organization_id,
    event_type,
    source_module,
    priority,
    status,
    idempotency_key,
    driver_id,
    triggered_by_actor_type,
    triggered_by_actor_id,
    payload
  )
  VALUES (
    p_organization_id,
    v_event_type,
    'admin_communications',
    'normal',
    'pending',
    v_idempotency_key,
    p_driver_id,
    'admin_user',
    p_actor_id,
    jsonb_build_object(
      'event_type', v_event_type,
      'category', v_category,
      'section', v_section,
      'inbox_type', p_type,
      'push_title', TRIM(p_title),
      'push_body', TRIM(p_body),
      'message', TRIM(p_body),
      'channels', jsonb_build_array('push', 'inbox')
    )
  )
  RETURNING id INTO v_event_id;

  PERFORM public.enqueue_driver_inbox_message(
    v_auth_user_id,
    p_organization_id,
    TRIM(p_title),
    TRIM(p_body),
    p_type
  );

  RETURN v_event_id;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.admin_enqueue_driver_notification(uuid, uuid, text, text, text, uuid)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_enqueue_driver_notification(uuid, uuid, text, text, text, uuid)
  TO authenticated;
