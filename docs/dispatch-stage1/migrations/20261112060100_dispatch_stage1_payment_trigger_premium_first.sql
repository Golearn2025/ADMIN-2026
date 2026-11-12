-- NOTE: start_premium_dispatch_run now returns action_required when no eligible Premium.
-- Payment trigger must NOT treat that as success/open. See RAPORT §5 — awaiting decision.

-- =============================================================================
-- REVIEW ONLY — DO NOT APPLY TO PRODUCTION WITHOUT EXPLICIT APPROVAL
-- Payment-succeeded enqueue: respect Direct; for automatic waves start Premium
-- instead of broadcasting Open to everyone.
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

    -- A) Direct exclusive: single-driver event only
    IF dispatch.wave = 'direct' AND dispatch.exclusive_driver_id IS NOT NULL THEN
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

    -- B) Automatic waves: Premium first (timer starts now)
    IF coalesce(v_auto, false) = true THEN
      v_started := public.start_premium_dispatch_run(bl.id, NULL);
      -- If no eligible premium, do NOT silently Open (await product decision).
      IF coalesce((v_started->>'success')::boolean, false) IS NOT TRUE THEN
        -- Leave without Open broadcast; ops can release manually.
        CONTINUE;
      END IF;
      CONTINUE;
    END IF;

    -- C) Fallback Open broadcast event (legacy) — backend MUST still filter by
    --    vehicle + org; Stage1 backend patch requires honouring driver_id when set.
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
  'REVIEW: Direct → single driver; automatic waves → Premium first; else Open fallback.';
