-- =============================================================================
-- REVIEW ONLY — DO NOT APPLY TO PRODUCTION / VL NEW WITHOUT EXPLICIT APPROVAL
-- Stage 1 corrected: atomic accept + vehicle/booking guards + authorized dispatch
-- + empty-Premium → Open (option A) + Open notify for previously-unnotified drivers
-- Compared against LIVE VL NEW definitions (read 2026-11-12).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 0a) Helpers: vehicle match (any eligible vehicle of driver) — offers / waves
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.driver_vehicle_matches_leg(
  p_driver_id uuid,
  p_vehicle_category_id text,
  p_vehicle_model_id text
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.vehicles v
    WHERE v.driver_id = p_driver_id
      AND v.status = 'active'
      AND v.deleted_at IS NULL
      AND (
        (p_vehicle_model_id IS NOT NULL AND v.model_id = p_vehicle_model_id)
        OR (
          p_vehicle_model_id IS NULL
          AND p_vehicle_category_id IS NOT NULL
          AND v.category_id = p_vehicle_category_id
        )
      )
  );
$function$;

REVOKE ALL ON FUNCTION public.driver_vehicle_matches_leg(uuid, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.driver_vehicle_matches_leg(uuid, text, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.driver_vehicle_matches_leg(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.driver_vehicle_matches_leg(uuid, text, text) TO service_role;

-- -----------------------------------------------------------------------------
-- 0b) Exact selected vehicle: owner, org, can_receive_jobs, model/category of leg
--     can_receive_jobs alone is NOT enough.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.driver_selected_vehicle_matches_leg(
  p_driver_id uuid,
  p_vehicle_id uuid,
  p_organization_id uuid,
  p_vehicle_category_id text,
  p_vehicle_model_id text
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.vehicles v
    JOIN public.driver_app_vehicle dav
      ON dav.vehicle_id = v.id
     AND dav.driver_id = p_driver_id
    WHERE v.id = p_vehicle_id
      AND v.driver_id = p_driver_id
      AND v.organization_id = p_organization_id
      AND v.deleted_at IS NULL
      AND v.status = 'active'
      AND dav.can_receive_jobs IS TRUE
      AND dav.organization_id = p_organization_id
      AND (
        (p_vehicle_model_id IS NOT NULL AND v.model_id = p_vehicle_model_id)
        OR (
          p_vehicle_model_id IS NULL
          AND p_vehicle_category_id IS NOT NULL
          AND v.category_id = p_vehicle_category_id
        )
      )
  );
$function$;

REVOKE ALL ON FUNCTION public.driver_selected_vehicle_matches_leg(uuid, uuid, uuid, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.driver_selected_vehicle_matches_leg(uuid, uuid, uuid, text, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.driver_selected_vehicle_matches_leg(uuid, uuid, uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.driver_selected_vehicle_matches_leg(uuid, uuid, uuid, text, text) TO service_role;

-- -----------------------------------------------------------------------------
-- 0c) Parent booking: not deleted, CONFIRMED, succeeded payment (offers rules)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.booking_parent_is_accept_ready(p_booking_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.bookings b
    WHERE b.id = p_booking_id
      AND b.deleted_at IS NULL
      AND b.status = 'CONFIRMED'::booking_status
      AND EXISTS (
        SELECT 1
        FROM public.booking_payments bp
        WHERE bp.booking_id = b.id
          AND bp.deleted_at IS NULL
          AND bp.status = 'succeeded'::payment_status
      )
  );
$function$;

REVOKE ALL ON FUNCTION public.booking_parent_is_accept_ready(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.booking_parent_is_accept_ready(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.booking_parent_is_accept_ready(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.booking_parent_is_accept_ready(uuid) TO service_role;

-- -----------------------------------------------------------------------------
-- 0d) Authorization for internal dispatch RPCs
--     Cron advance_expired runs as DB role (no JWT) — must allow postgres /
--     supabase_admin. Admin API uses service_role. Org members via is_org_member.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.dispatch_caller_is_backend()
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $function$
  SELECT
    public.is_service_role()
    OR coalesce(auth.role(), '') = 'service_role'
    OR current_user IN ('postgres', 'supabase_admin', 'supabase_cron')
    OR session_user IN ('postgres', 'supabase_admin');
$function$;

CREATE OR REPLACE FUNCTION public.dispatch_caller_can_manage_org(p_organization_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT
    public.dispatch_caller_is_backend()
    OR public.is_super_admin()
    OR (
      auth.uid() IS NOT NULL
      AND p_organization_id IS NOT NULL
      AND public.is_org_member(p_organization_id)
    );
$function$;

REVOKE ALL ON FUNCTION public.dispatch_caller_is_backend() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.dispatch_caller_is_backend() FROM anon;
GRANT EXECUTE ON FUNCTION public.dispatch_caller_is_backend() TO authenticated;
GRANT EXECUTE ON FUNCTION public.dispatch_caller_is_backend() TO service_role;

REVOKE ALL ON FUNCTION public.dispatch_caller_can_manage_org(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.dispatch_caller_can_manage_org(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.dispatch_caller_can_manage_org(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.dispatch_caller_can_manage_org(uuid) TO service_role;

-- -----------------------------------------------------------------------------
-- 1a) JSONB overload used by Driver App — bind caller identity + booking parent
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.driver_accept_job(
  p_leg_id uuid,
  p_driver_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  job_data jsonb;
  v_caller uuid := auth.uid();
  v_driver_id uuid;
  v_driver_org uuid;
  v_leg record;
  v_updated integer;
BEGIN
  IF v_caller IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Authentication required');
  END IF;

  SELECT d.id, d.organization_id
    INTO v_driver_id, v_driver_org
  FROM public.drivers d
  WHERE d.auth_user_id = v_caller
    AND d.is_active = true
    AND d.is_approved = true
    AND d.deleted_at IS NULL
    AND d.status = 'approved';

  IF v_driver_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Driver not found or not approved');
  END IF;

  IF p_driver_id IS NOT NULL AND p_driver_id IS DISTINCT FROM v_driver_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot accept as another driver');
  END IF;

  SELECT bl.*
    INTO v_leg
  FROM public.booking_legs bl
  WHERE bl.id = p_leg_id
    AND bl.deleted_at IS NULL
  FOR UPDATE;

  IF v_leg.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Job not found');
  END IF;

  IF v_leg.organization_id IS DISTINCT FROM v_driver_org THEN
    RETURN jsonb_build_object('success', false, 'error', 'Organization mismatch');
  END IF;

  IF NOT public.booking_parent_is_accept_ready(v_leg.booking_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Booking not confirmed or payment invalid');
  END IF;

  IF v_leg.status IS DISTINCT FROM 'PENDING'::leg_status OR v_leg.assigned_driver_id IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Job not available for acceptance');
  END IF;

  IF NOT public.driver_vehicle_matches_leg(
    v_driver_id, v_leg.vehicle_category_id, v_leg.vehicle_model_id
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Vehicle not eligible for this job');
  END IF;

  IF NOT public.job_offer_wave_allows_driver(p_leg_id, v_driver_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Job reserved for another driver');
  END IF;

  UPDATE public.booking_legs
  SET
    status = 'ASSIGNED'::leg_status,
    assigned_driver_id = v_driver_id,
    assigned_at = now(),
    updated_at = now()
  WHERE id = p_leg_id
    AND status = 'PENDING'::leg_status
    AND assigned_driver_id IS NULL
    AND deleted_at IS NULL;

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  IF v_updated = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Job not available for acceptance');
  END IF;

  UPDATE public.job_dispatch_runs
  SET status = 'accepted',
      accepted_at = now(),
      updated_at = now()
  WHERE booking_leg_id = p_leg_id
    AND status = 'active';

  SELECT jsonb_build_object(
    'job_id', id,
    'status', status,
    'assigned_driver_id', assigned_driver_id,
    'assigned_at', assigned_at
  ) INTO job_data
  FROM public.booking_legs
  WHERE id = p_leg_id;

  RETURN jsonb_build_object('success', true, 'data', job_data);
END;
$function$;

REVOKE ALL ON FUNCTION public.driver_accept_job(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.driver_accept_job(uuid, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.driver_accept_job(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.driver_accept_job(uuid, uuid) TO service_role;

-- -----------------------------------------------------------------------------
-- 1b) Boolean overload (driver_id, vehicle_id, leg_id) — exact selected vehicle
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.driver_accept_job(
  p_driver_id uuid,
  p_vehicle_id uuid,
  p_booking_leg_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_caller uuid := auth.uid();
  v_self uuid;
  v_org uuid;
  v_leg record;
  v_updated integer;
BEGIN
  IF v_caller IS NULL THEN
    RETURN false;
  END IF;

  SELECT d.id, d.organization_id
    INTO v_self, v_org
  FROM public.drivers d
  WHERE d.auth_user_id = v_caller
    AND d.deleted_at IS NULL
    AND d.is_active = true
    AND d.is_approved = true
    AND d.status = 'approved';

  IF v_self IS NULL OR v_self IS DISTINCT FROM p_driver_id THEN
    RETURN false;
  END IF;

  SELECT bl.*
    INTO v_leg
  FROM public.booking_legs bl
  WHERE bl.id = p_booking_leg_id
    AND bl.deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND OR v_leg.assigned_driver_id IS NOT NULL THEN
    RETURN false;
  END IF;

  IF v_leg.organization_id IS DISTINCT FROM v_org THEN
    RETURN false;
  END IF;

  IF NOT public.booking_parent_is_accept_ready(v_leg.booking_id) THEN
    RETURN false;
  END IF;

  IF v_leg.status IS DISTINCT FROM 'PENDING'::leg_status THEN
    RETURN false;
  END IF;

  IF NOT public.job_offer_wave_allows_driver(p_booking_leg_id, p_driver_id) THEN
    RETURN false;
  END IF;

  -- Exact vehicle: owner + org + can_receive_jobs + model/category of leg
  IF NOT public.driver_selected_vehicle_matches_leg(
    p_driver_id,
    p_vehicle_id,
    v_leg.organization_id,
    v_leg.vehicle_category_id,
    v_leg.vehicle_model_id
  ) THEN
    RETURN false;
  END IF;

  UPDATE public.booking_legs
  SET
    assigned_driver_id = p_driver_id,
    assigned_vehicle_id = p_vehicle_id,
    status = 'ASSIGNED'::leg_status,
    assigned_at = now(),
    updated_at = now()
  WHERE id = p_booking_leg_id
    AND status = 'PENDING'::leg_status
    AND assigned_driver_id IS NULL
    AND deleted_at IS NULL;

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  IF v_updated = 0 THEN
    RETURN false;
  END IF;

  UPDATE public.job_dispatch_runs
  SET status = 'accepted',
      accepted_at = now(),
      updated_at = now()
  WHERE booking_leg_id = p_booking_leg_id
    AND status = 'active';

  RETURN true;
END;
$function$;

REVOKE ALL ON FUNCTION public.driver_accept_job(uuid, uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.driver_accept_job(uuid, uuid, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.driver_accept_job(uuid, uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.driver_accept_job(uuid, uuid, uuid) TO service_role;

-- -----------------------------------------------------------------------------
-- 2) Wave notifications
--    Open: every eligible org driver NOT previously notified for this job
--    (includes drivers added to Premium after Premium enqueue).
--    Skip is by prior notification_events, NOT by current Premium membership.
--    Direct remains exclusive (notified elsewhere).
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.enqueue_dispatch_wave_notifications(
  p_booking_leg_id uuid,
  p_wave text
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  bl record;
  b record;
  v_count integer := 0;
  v_driver record;
  v_payload jsonb;
  v_pickup text;
  v_dropoff text;
  v_base integer;
  v_extras integer;
BEGIN
  IF p_wave IS DISTINCT FROM 'direct'
     AND p_wave IS DISTINCT FROM 'premium'
     AND p_wave IS DISTINCT FROM 'open' THEN
    RAISE EXCEPTION 'invalid dispatch wave: %', p_wave
      USING ERRCODE = '22023';
  END IF;

  SELECT * INTO bl FROM public.booking_legs WHERE id = p_booking_leg_id AND deleted_at IS NULL;
  IF bl.id IS NULL THEN RETURN 0; END IF;

  IF NOT public.dispatch_caller_can_manage_org(bl.organization_id) THEN
    RAISE EXCEPTION 'not authorized to enqueue dispatch notifications'
      USING ERRCODE = '42501';
  END IF;

  IF bl.status IS DISTINCT FROM 'PENDING'::leg_status OR bl.assigned_driver_id IS NOT NULL THEN
    RETURN 0;
  END IF;

  SELECT * INTO b FROM public.bookings WHERE id = bl.booking_id AND deleted_at IS NULL;
  IF b.id IS NULL OR b.status IS DISTINCT FROM 'CONFIRMED'::booking_status THEN
    RETURN 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.booking_payments bp
    WHERE bp.booking_id = b.id AND bp.deleted_at IS NULL AND bp.status = 'succeeded'::payment_status
  ) THEN
    RETURN 0;
  END IF;

  v_pickup := CASE WHEN lower(coalesce(bl.leg_kind::text, '')) = 'return'
    THEN public.format_location_preview(COALESCE(b.trip_configuration_raw -> 'returnPickup', b.trip_configuration_raw -> 'dropoff'))
    ELSE public.format_location_preview(b.trip_configuration_raw -> 'pickup') END;
  v_dropoff := CASE WHEN lower(coalesce(bl.leg_kind::text, '')) = 'return'
    THEN public.format_location_preview(COALESCE(b.trip_configuration_raw -> 'returnDropoff', b.trip_configuration_raw -> 'pickup'))
    ELSE public.format_location_preview(b.trip_configuration_raw -> 'dropoff') END;
  v_base := public.driver_offer_base_payout_for_leg(bl.id, bl.scheduled_at, bl.organization_id);
  v_extras := coalesce(public.sum_paid_upgrades_driver_pence(bl.addons, b.trip_configuration_raw), 0);

  v_payload := jsonb_build_object(
    'event_type', 'driver_job_available',
    'dispatch_wave', p_wave,
    'booking_reference', b.reference,
    'booking_type', b.booking_type::text,
    'currency', coalesce(b.currency, 'GBP'),
    'job_id', bl.id,
    'booking_id', bl.booking_id,
    'leg_kind', bl.leg_kind,
    'leg_number', bl.leg_number,
    'pickup_preview', v_pickup,
    'dropoff_preview', v_dropoff,
    'scheduled_at', bl.scheduled_at,
    'vehicle_category_id', bl.vehicle_category_id,
    'vehicle_model_id', bl.vehicle_model_id,
    'driver_payout_pence', v_base,
    'paid_extras_pence', v_extras,
    'driver_total_pence', coalesce(v_base,0) + v_extras,
    'driver_payout_display', public.driver_payout_display_label(coalesce(v_base,0) + v_extras),
    'push_title', CASE
      WHEN p_wave = 'premium' THEN 'Premium job available'
      WHEN p_wave = 'direct' THEN 'Job reserved for you'
      ELSE 'New job available'
    END,
    'push_body', format('%s · %s → %s', coalesce(b.reference, 'Job'), coalesce(v_pickup, 'Pickup'), coalesce(v_dropoff, 'Drop-off'))
  );

  IF p_wave = 'direct' THEN
    RETURN 0; -- Direct notify via payment trigger with exclusive_driver_id
  ELSIF p_wave = 'premium' THEN
    FOR v_driver IN
      SELECT pd.driver_id
      FROM public.dispatch_premium_drivers pd
      JOIN public.drivers d
        ON d.id = pd.driver_id
       AND d.deleted_at IS NULL
       AND d.status = 'approved'
       AND d.organization_id = bl.organization_id
      WHERE pd.organization_id = bl.organization_id
        AND public.driver_vehicle_matches_leg(pd.driver_id, bl.vehicle_category_id, bl.vehicle_model_id)
    LOOP
      INSERT INTO public.notification_events (
        organization_id, event_type, source_module, priority, status,
        idempotency_key, booking_id, job_id, driver_id, payload
      ) VALUES (
        bl.organization_id,
        'driver_job_available',
        'dispatch_wave_premium',
        'high',
        'pending',
        format('driver_job_available:wave:premium:%s:%s:%s', bl.organization_id, bl.id, v_driver.driver_id),
        bl.booking_id,
        bl.id,
        v_driver.driver_id,
        v_payload || jsonb_build_object('exclusive_driver_id', v_driver.driver_id)
      )
      ON CONFLICT (organization_id, idempotency_key) DO NOTHING;
      IF FOUND THEN v_count := v_count + 1; END IF;
    END LOOP;
  ELSIF p_wave = 'open' THEN
    -- Eligible org drivers who were NEVER notified for this job (any wave).
    -- Includes drivers added to Premium after Premium enqueue (missed Premium push).
    -- Does NOT re-notify drivers who already have a non-cancelled event.
    FOR v_driver IN
      SELECT d.id AS driver_id
      FROM public.drivers d
      WHERE d.organization_id = bl.organization_id
        AND d.deleted_at IS NULL
        AND d.status = 'approved'
        AND public.driver_vehicle_matches_leg(d.id, bl.vehicle_category_id, bl.vehicle_model_id)
        AND NOT EXISTS (
          SELECT 1 FROM public.notification_events ne
          WHERE ne.organization_id = bl.organization_id
            AND ne.job_id = bl.id
            AND ne.event_type = 'driver_job_available'
            AND ne.driver_id = d.id
            AND ne.status IS DISTINCT FROM 'cancelled'
        )
    LOOP
      INSERT INTO public.notification_events (
        organization_id, event_type, source_module, priority, status,
        idempotency_key, booking_id, job_id, driver_id, payload
      ) VALUES (
        bl.organization_id,
        'driver_job_available',
        'dispatch_wave_open',
        'high',
        'pending',
        format('driver_job_available:wave:open:%s:%s:%s', bl.organization_id, bl.id, v_driver.driver_id),
        bl.booking_id,
        bl.id,
        v_driver.driver_id,
        v_payload || jsonb_build_object('exclusive_driver_id', v_driver.driver_id)
      )
      ON CONFLICT (organization_id, idempotency_key) DO NOTHING;
      IF FOUND THEN v_count := v_count + 1; END IF;
    END LOOP;
  END IF;

  RETURN v_count;
END;
$function$;

REVOKE ALL ON FUNCTION public.enqueue_dispatch_wave_notifications(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.enqueue_dispatch_wave_notifications(uuid, text) FROM anon;
REVOKE ALL ON FUNCTION public.enqueue_dispatch_wave_notifications(uuid, text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.enqueue_dispatch_wave_notifications(uuid, text) TO service_role;

-- -----------------------------------------------------------------------------
-- 3) start_premium_dispatch_run — Option A: empty Premium → Open immediately
--    Always creates an active run (premium or open). Direct stays exclusive.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.start_premium_dispatch_run(
  p_booking_leg_id uuid,
  p_actor_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  bl record;
  v_wait integer := 10;
  v_now timestamptz := now();
  v_expires timestamptz;
  v_premium_count integer := 0;
  v_n integer := 0;
BEGIN
  SELECT * INTO bl FROM public.booking_legs WHERE id = p_booking_leg_id AND deleted_at IS NULL;
  IF bl.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Leg not found');
  END IF;

  IF NOT public.dispatch_caller_can_manage_org(bl.organization_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized');
  END IF;

  IF bl.status IS DISTINCT FROM 'PENDING'::leg_status OR bl.assigned_driver_id IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Leg not dispatchable');
  END IF;

  IF NOT public.booking_parent_is_accept_ready(bl.booking_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Booking not confirmed or payment invalid');
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.job_dispatch_runs r
    WHERE r.booking_leg_id = bl.id AND r.status = 'active' AND r.wave = 'direct'
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Direct wave active — not starting Premium');
  END IF;

  SELECT coalesce(premium_wait_minutes, 10) INTO v_wait
  FROM public.dispatch_org_settings WHERE organization_id = bl.organization_id;
  v_wait := greatest(coalesce(v_wait, 10), 1);
  v_expires := v_now + make_interval(mins => v_wait);

  SELECT count(*) INTO v_premium_count
  FROM public.dispatch_premium_drivers pd
  JOIN public.drivers d ON d.id = pd.driver_id AND d.deleted_at IS NULL AND d.status = 'approved'
  WHERE pd.organization_id = bl.organization_id
    AND public.driver_vehicle_matches_leg(pd.driver_id, bl.vehicle_category_id, bl.vehicle_model_id);

  UPDATE public.job_dispatch_runs
  SET status = 'cancelled', released_at = v_now, updated_at = v_now
  WHERE booking_leg_id = bl.id AND status = 'active';

  -- Option A: no eligible Premium → Open immediately (keep model/category filter).
  -- Never leave the leg without an active run while still PENDING.
  IF v_premium_count = 0 THEN
    INSERT INTO public.job_dispatch_runs (
      organization_id, booking_id, booking_leg_id, mode, wave,
      exclusive_driver_id, status, started_at, created_by, updated_at
    ) VALUES (
      bl.organization_id, bl.booking_id, bl.id, 'waves', 'open',
      NULL, 'active', v_now, p_actor_id, v_now
    );

    v_n := public.enqueue_dispatch_wave_notifications(bl.id, 'open');
    RETURN jsonb_build_object(
      'success', true,
      'wave', 'open',
      'reason', 'no_eligible_premium_open_immediately',
      'premium_eligible', 0,
      'notifications', v_n
    );
  END IF;

  INSERT INTO public.job_dispatch_runs (
    organization_id, booking_id, booking_leg_id, mode, wave,
    exclusive_driver_id, status, started_at, expires_at, created_by, updated_at
  ) VALUES (
    bl.organization_id, bl.booking_id, bl.id, 'waves', 'premium',
    NULL, 'active', v_now, v_expires, p_actor_id, v_now
  );

  v_n := public.enqueue_dispatch_wave_notifications(bl.id, 'premium');
  RETURN jsonb_build_object(
    'success', true,
    'wave', 'premium',
    'premium_eligible', v_premium_count,
    'notifications', v_n,
    'expires_at', v_expires
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.start_premium_dispatch_run(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.start_premium_dispatch_run(uuid, uuid) FROM anon;
REVOKE ALL ON FUNCTION public.start_premium_dispatch_run(uuid, uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.start_premium_dispatch_run(uuid, uuid) TO service_role;
-- Org admins may call via user JWT (Admin API preferably uses service_role).
GRANT EXECUTE ON FUNCTION public.start_premium_dispatch_run(uuid, uuid) TO authenticated;

-- -----------------------------------------------------------------------------
-- 4) Advance Premium → Open only (Direct NEVER auto-advances)
--    Compatible with pg_cron: SELECT advance_expired_job_dispatch_waves();
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.advance_expired_job_dispatch_waves()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_run record;
  v_advanced integer := 0;
  v_notified integer := 0;
  v_skipped_auth integer := 0;
  v_n integer;
  v_now timestamptz := now();
BEGIN
  -- Backend / cron / super-admin only. Not a public driver RPC.
  IF NOT (
    public.dispatch_caller_is_backend()
    OR public.is_super_admin()
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Not authorized',
      'advanced', 0,
      'notifications', 0
    );
  END IF;

  FOR v_run IN
    SELECT r.*
    FROM public.job_dispatch_runs r
    JOIN public.booking_legs bl ON bl.id = r.booking_leg_id
    WHERE r.status = 'active'
      AND r.wave = 'premium'
      AND r.expires_at IS NOT NULL
      AND r.expires_at <= v_now
      AND bl.deleted_at IS NULL
      AND bl.status = 'PENDING'::leg_status
      AND bl.assigned_driver_id IS NULL
    FOR UPDATE OF r SKIP LOCKED
  LOOP
    -- Org sanity (cron is global backend; still require org present)
    IF v_run.organization_id IS NULL THEN
      v_skipped_auth := v_skipped_auth + 1;
      CONTINUE;
    END IF;

    UPDATE public.job_dispatch_runs
    SET status = 'expired',
        released_at = v_now,
        updated_at = v_now
    WHERE id = v_run.id;

    INSERT INTO public.job_dispatch_runs (
      organization_id, booking_id, booking_leg_id, mode, wave,
      exclusive_driver_id, status, started_at, created_by, updated_at
    ) VALUES (
      v_run.organization_id, v_run.booking_id, v_run.booking_leg_id,
      coalesce(v_run.mode, 'waves'), 'open',
      NULL, 'active', v_now, v_run.created_by, v_now
    );

    v_n := public.enqueue_dispatch_wave_notifications(v_run.booking_leg_id, 'open');
    v_notified := v_notified + coalesce(v_n, 0);
    v_advanced := v_advanced + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'advanced', v_advanced,
    'notifications', v_notified,
    'skipped', v_skipped_auth
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.advance_expired_job_dispatch_waves() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.advance_expired_job_dispatch_waves() FROM anon;
REVOKE ALL ON FUNCTION public.advance_expired_job_dispatch_waves() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.advance_expired_job_dispatch_waves() TO service_role;
-- pg_cron executes as DB owner; EXECUTE for postgres/supabase_admin is implicit for owner.
-- Keep authenticated revoked: Admin UI must use service-role client (already does).
