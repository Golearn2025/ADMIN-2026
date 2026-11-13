-- =============================================================================
-- REVIEW ONLY — DO NOT APPLY TO PRODUCTION WITHOUT EXPLICIT APPROVAL
-- Payment-succeeded enqueue: Direct exclusive; automatic waves → Premium first;
-- empty Premium (Option A) → start_premium_dispatch_run opens immediately.
-- Trigger remains SECURITY DEFINER (fires on booking_payments); it calls
-- start_premium_dispatch_run which authorizes via dispatch_caller_is_backend()
-- (definer owner / service_role). Compatible with waves_enabled_automatic flag.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.enqueue_driver_job_available_on_payment_succeeded()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_booking_reference text;
  v_booking_type text;
  v_currency text;
  v_org uuid;
  v_auto boolean := false;
  bl record;
  dispatch record;
  v_started jsonb;
BEGIN
  IF new.status <> 'succeeded' THEN
    RETURN new;
  END IF;

  IF tg_op = 'UPDATE' AND coalesce(old.status::text, '') = 'succeeded' THEN
    RETURN new;
  END IF;

  SELECT b.reference, b.booking_type::text, b.currency, b.organization_id
    INTO v_booking_reference, v_booking_type, v_currency, v_org
  FROM public.bookings b
  WHERE b.id = new.booking_id
  LIMIT 1;

  SELECT coalesce(waves_enabled_automatic, false) INTO v_auto
  FROM public.dispatch_org_settings
  WHERE organization_id = v_org;

  FOR bl IN
    SELECT *
    FROM public.booking_legs
    WHERE booking_id = new.booking_id
      AND status = 'PENDING'
      AND assigned_driver_id IS NULL
      AND deleted_at IS NULL
  LOOP
    SELECT r.wave, r.exclusive_driver_id
      INTO dispatch
    FROM public.job_dispatch_runs r
    WHERE r.booking_leg_id = bl.id AND r.status = 'active'
    ORDER BY r.started_at DESC
    LIMIT 1;

    -- A) Direct wave: exclusivity REQUIRED. If exclusive_driver_id missing
    --    (failed save), do NOT fan-out to Premium/Open/legacy broadcast.
    IF dispatch.wave = 'direct' THEN
      IF dispatch.exclusive_driver_id IS NULL THEN
        CONTINUE; -- eșec salvare exclusivitate — zero notify
      END IF;
      IF NOT public.job_leg_is_offerable(bl.id) THEN
        CONTINUE;
      END IF;
      INSERT INTO public.notification_events (
        organization_id, event_type, source_module, priority, status,
        idempotency_key, booking_id, job_id, driver_id, payload
      ) VALUES (
        bl.organization_id,
        'driver_job_available',
        'dispatch_payment_succeeded',
        'high',
        'pending',
        format('driver_job_available:payment_succeeded:%s:%s', bl.organization_id, bl.id),
        bl.booking_id,
        bl.id,
        dispatch.exclusive_driver_id,
        jsonb_build_object(
          'event_type', 'driver_job_available',
          'dispatch_wave', 'direct',
          'exclusive_driver_id', dispatch.exclusive_driver_id,
          'booking_reference', v_booking_reference,
          'booking_type', v_booking_type,
          'job_id', bl.id,
          'booking_id', bl.booking_id,
          'vehicle_category_id', bl.vehicle_category_id,
          'vehicle_model_id', bl.vehicle_model_id,
          'scheduled_at', bl.scheduled_at,
          'push_title', 'Job reserved for you'
        )
      )
      ON CONFLICT (organization_id, idempotency_key) DO NOTHING;
      CONTINUE;
    END IF;

    -- B) Automatic waves: Premium first; Option A opens immediately if empty Premium
    IF coalesce(v_auto, false) = true THEN
      v_started := public.start_premium_dispatch_run(bl.id, NULL);
      -- success=true covers premium OR open_immediately (no_eligible_premium_open_immediately)
      IF coalesce((v_started->>'success')::boolean, false) IS NOT TRUE THEN
        CONTINUE;
      END IF;
      CONTINUE;
    END IF;

    -- C) Fallback Open broadcast event (legacy) — only when automatic waves OFF.
    --    Prefer per-driver Open via start_premium / advance once Stage1 is applied
    --    and waves are enabled. Backend must still honour driver_id when set.
    INSERT INTO public.notification_events (
      organization_id, event_type, source_module, priority, status,
      idempotency_key, booking_id, job_id, driver_id, payload
    ) VALUES (
      bl.organization_id,
      'driver_job_available',
      'dispatch_payment_succeeded',
      'high',
      'pending',
      format('driver_job_available:payment_succeeded:%s:%s', bl.organization_id, bl.id),
      bl.booking_id,
      bl.id,
      NULL,
      jsonb_build_object(
        'event_type', 'driver_job_available',
        'dispatch_wave', coalesce(dispatch.wave, 'open'),
        'booking_reference', v_booking_reference,
        'booking_type', v_booking_type,
        'job_id', bl.id,
        'booking_id', bl.booking_id,
        'vehicle_category_id', bl.vehicle_category_id,
        'vehicle_model_id', bl.vehicle_model_id,
        'scheduled_at', bl.scheduled_at
      )
    )
    ON CONFLICT (organization_id, idempotency_key) DO NOTHING;
  END LOOP;

  RETURN new;
END;
$function$;

COMMENT ON FUNCTION public.enqueue_driver_job_available_on_payment_succeeded() IS
  'REVIEW: Direct → single driver; automatic waves → Premium then Open (Option A if empty Premium).';
