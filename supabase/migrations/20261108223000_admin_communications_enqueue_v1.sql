-- Allow admin-originated driver notification event types + enqueue helper (ledger + inbox).

ALTER TABLE public.notification_events
  DROP CONSTRAINT IF EXISTS notification_events_event_type_chk;

ALTER TABLE public.notification_events
  ADD CONSTRAINT notification_events_event_type_chk
  CHECK (event_type = ANY (ARRAY[
    'customer_account_created'::text,
    'booking_payment_confirmed'::text,
    'booking_confirmed'::text,
    'driver_job_available'::text,
    'driver_job_accepted'::text,
    'trip_reminder_2h_before_pickup'::text,
    'trip_driver_started_pickup'::text,
    'trip_driver_arrived'::text,
    'trip_passenger_on_board'::text,
    'trip_completed'::text,
    'booking_cancelled'::text,
    'payment_failed'::text,
    'admin_driver_system'::text,
    'admin_driver_documents'::text,
    'admin_driver_jobs'::text
  ]));

CREATE OR REPLACE FUNCTION public.admin_enqueue_driver_notification(
  p_organization_id uuid,
  p_driver_id uuid,
  p_category text,
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
  v_inbox_type text;
  v_idempotency_key text;
BEGIN
  IF p_category NOT IN ('system', 'documents', 'jobs') THEN
    RAISE EXCEPTION 'invalid category: %', p_category;
  END IF;

  IF NULLIF(TRIM(p_title), '') IS NULL OR NULLIF(TRIM(p_body), '') IS NULL THEN
    RAISE EXCEPTION 'title and body are required';
  END IF;

  v_event_type := CASE p_category
    WHEN 'documents' THEN 'admin_driver_documents'
    WHEN 'jobs' THEN 'admin_driver_jobs'
    ELSE 'admin_driver_system'
  END;

  v_inbox_type := CASE p_category
    WHEN 'documents' THEN 'document_reminder'
    WHEN 'jobs' THEN 'job_alert'
    ELSE 'app_update'
  END;

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
    'admin_driver_%s:%s:%s:%s',
    p_category,
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
      'category', p_category,
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
    v_inbox_type
  );

  RETURN v_event_id;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.admin_enqueue_driver_notification(uuid, uuid, text, text, text, uuid)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_enqueue_driver_notification(uuid, uuid, text, text, text, uuid)
  TO authenticated;
