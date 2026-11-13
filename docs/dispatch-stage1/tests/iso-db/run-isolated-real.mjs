/**
 * Isolated REAL implementation tests — PGlite (Postgres WASM), fake provider,
 * fictional accounts. NO production, NO OneSignal, NO VL NEW apply.
 *
 * Run: node docs/dispatch-stage1/tests/iso-db/run-isolated-real.mjs
 */
import assert from 'node:assert/strict';
import { PGlite } from '@electric-sql/pglite';

const results = { passed: [], failed: [], skipped: [] };

async function check(name, fn) {
  try {
    await fn();
    results.passed.push(name);
    console.log(`PASS  ${name}`);
  } catch (e) {
    results.failed.push({ name, error: String(e?.message || e) });
    console.log(`FAIL  ${name}: ${e?.message || e}`);
  }
}

function skip(name, reason) {
  results.skipped.push({ name, reason });
  console.log(`SKIP  ${name} — ${reason}`);
}

async function main() {
  const db = new PGlite();
  await db.exec(`
    CREATE SCHEMA IF NOT EXISTS auth;
    CREATE TABLE auth.users (
      id uuid PRIMARY KEY,
      is_super_admin boolean NOT NULL DEFAULT false
    );

    -- Session JWT stubs (set_config from test)
    CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
      SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid
    $$;
    CREATE OR REPLACE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS $$
      SELECT coalesce(nullif(current_setting('request.jwt.claim.role', true), ''), 'authenticated')
    $$;

    CREATE TABLE public.organizations (id uuid PRIMARY KEY, name text);
    CREATE TABLE public.organization_members (
      organization_id uuid REFERENCES public.organizations(id),
      user_id uuid REFERENCES auth.users(id),
      role text NOT NULL,
      PRIMARY KEY (organization_id, user_id)
    );
    CREATE TABLE public.drivers (
      id uuid PRIMARY KEY,
      auth_user_id uuid,
      organization_id uuid,
      status text NOT NULL DEFAULT 'approved',
      is_active boolean NOT NULL DEFAULT true,
      is_approved boolean NOT NULL DEFAULT true,
      deleted_at timestamptz
    );
    CREATE TABLE public.vehicles (
      id uuid PRIMARY KEY,
      driver_id uuid,
      organization_id uuid,
      model_id text,
      category_id text,
      status text NOT NULL DEFAULT 'active',
      deleted_at timestamptz
    );
    CREATE TABLE public.driver_app_vehicle (
      vehicle_id uuid,
      driver_id uuid,
      organization_id uuid,
      can_receive_jobs boolean,
      PRIMARY KEY (vehicle_id, driver_id)
    );
    CREATE TABLE public.bookings (
      id uuid PRIMARY KEY,
      organization_id uuid,
      reference text,
      booking_type text DEFAULT 'transfer',
      currency text DEFAULT 'GBP',
      status text NOT NULL,
      deleted_at timestamptz,
      trip_configuration_raw jsonb DEFAULT '{}'::jsonb
    );
    CREATE TABLE public.booking_payments (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      booking_id uuid,
      organization_id uuid,
      status text NOT NULL,
      deleted_at timestamptz
    );
    CREATE TABLE public.booking_legs (
      id uuid PRIMARY KEY,
      booking_id uuid,
      organization_id uuid,
      status text NOT NULL DEFAULT 'PENDING',
      assigned_driver_id uuid,
      assigned_vehicle_id uuid,
      assigned_at timestamptz,
      vehicle_category_id text,
      vehicle_model_id text,
      leg_kind text DEFAULT 'outbound',
      leg_number int DEFAULT 1,
      scheduled_at timestamptz DEFAULT now(),
      addons jsonb DEFAULT '[]'::jsonb,
      deleted_at timestamptz,
      updated_at timestamptz DEFAULT now()
    );
    CREATE TABLE public.job_dispatch_runs (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id uuid,
      booking_id uuid,
      booking_leg_id uuid,
      mode text,
      wave text,
      exclusive_driver_id uuid,
      status text,
      started_at timestamptz DEFAULT now(),
      expires_at timestamptz,
      accepted_at timestamptz,
      released_at timestamptz,
      created_by uuid,
      updated_at timestamptz DEFAULT now()
    );
    CREATE TABLE public.dispatch_premium_drivers (
      organization_id uuid,
      driver_id uuid,
      PRIMARY KEY (organization_id, driver_id)
    );
    CREATE TABLE public.dispatch_org_settings (
      organization_id uuid PRIMARY KEY,
      premium_wait_minutes int DEFAULT 10,
      waves_enabled_automatic boolean DEFAULT false
    );
    CREATE TABLE public.notification_events (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id uuid,
      event_type text,
      source_module text,
      priority text,
      status text,
      idempotency_key text,
      booking_id uuid,
      job_id uuid,
      driver_id uuid,
      payload jsonb DEFAULT '{}'::jsonb,
      next_retry_at timestamptz,
      retry_count int DEFAULT 0,
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now(),
      UNIQUE (organization_id, idempotency_key)
    );
    CREATE TABLE public.notification_deliveries (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id uuid,
      event_id uuid,
      recipient_id uuid,
      channel text,
      provider text,
      status text,
      provider_message_id text,
      next_retry_at timestamptz,
      attempt_no int DEFAULT 0,
      created_at timestamptz DEFAULT now()
    );

    -- Stubs for payout/format used by enqueue payload builders
    CREATE OR REPLACE FUNCTION public.format_location_preview(j jsonb) RETURNS text LANGUAGE sql AS $$ SELECT 'Loc' $$;
    CREATE OR REPLACE FUNCTION public.driver_offer_base_payout_for_leg(a uuid,b timestamptz,c uuid) RETURNS int LANGUAGE sql AS $$ SELECT 1000 $$;
    CREATE OR REPLACE FUNCTION public.sum_paid_upgrades_driver_pence(a jsonb,b jsonb) RETURNS int LANGUAGE sql AS $$ SELECT 0 $$;
    CREATE OR REPLACE FUNCTION public.driver_payout_display_label(p int) RETURNS text LANGUAGE sql AS $$ SELECT '£'||(p/100.0) $$;

    CREATE OR REPLACE FUNCTION public.is_service_role() RETURNS boolean LANGUAGE sql STABLE AS $$
      SELECT coalesce(current_setting('request.jwt.claim.role', true), '') = 'service_role'
    $$;
    CREATE OR REPLACE FUNCTION public.is_super_admin() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$
      SELECT EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND is_super_admin)
    $$;
    CREATE OR REPLACE FUNCTION public.has_org_role(p_org uuid, p_roles text[]) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER AS $$
      SELECT public.is_super_admin()
        OR EXISTS (
          SELECT 1 FROM public.organization_members om
          WHERE om.organization_id = p_org AND om.user_id = auth.uid() AND om.role = ANY(p_roles)
        )
    $$;

    CREATE OR REPLACE FUNCTION public.job_offer_wave_allows_driver(p_leg uuid, p_driver uuid)
    RETURNS boolean LANGUAGE plpgsql STABLE AS $$
    DECLARE r record;
    BEGIN
      SELECT * INTO r FROM job_dispatch_runs
      WHERE booking_leg_id = p_leg AND status = 'active'
      ORDER BY started_at DESC LIMIT 1;
      IF NOT FOUND THEN RETURN true; END IF;
      IF r.wave = 'open' THEN RETURN true; END IF;
      IF r.wave = 'direct' THEN RETURN r.exclusive_driver_id = p_driver; END IF;
      IF r.wave = 'premium' THEN
        RETURN EXISTS (
          SELECT 1 FROM dispatch_premium_drivers d
          WHERE d.organization_id = r.organization_id AND d.driver_id = p_driver
        );
      END IF;
      RETURN true;
    END $$;
  `);

  // Auth helpers (corrected — no current_user)
  await db.exec(`
    CREATE OR REPLACE FUNCTION public.dispatch_caller_is_backend()
    RETURNS boolean LANGUAGE sql STABLE SET search_path TO 'public' AS $$
      SELECT
        public.is_service_role()
        OR coalesce(auth.role(), '') = 'service_role'
        OR coalesce(current_setting('request.jwt.claim.role', true), '') = 'service_role'
        OR (
          auth.uid() IS NULL
          AND coalesce(current_setting('request.jwt.claim.sub', true), '') = ''
          AND coalesce(current_setting('request.jwt.claim.role', true), '') = ''
          AND session_user IN ('postgres', 'supabase_admin')
        );
    $$;

    CREATE OR REPLACE FUNCTION public.dispatch_caller_can_manage_org(p_organization_id uuid)
    RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
      SELECT
        public.dispatch_caller_is_backend()
        OR public.is_super_admin()
        OR (
          auth.uid() IS NOT NULL
          AND p_organization_id IS NOT NULL
          AND public.has_org_role(p_organization_id, ARRAY['owner','admin','operator']::text[])
        );
    $$;

    CREATE OR REPLACE FUNCTION public.booking_parent_is_accept_ready(p_booking_id uuid)
    RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
      SELECT EXISTS (
        SELECT 1 FROM bookings b
        WHERE b.id = p_booking_id AND b.deleted_at IS NULL AND b.status = 'CONFIRMED'
          AND EXISTS (
            SELECT 1 FROM booking_payments bp
            WHERE bp.booking_id = b.id AND bp.deleted_at IS NULL AND bp.status = 'succeeded'
          )
      );
    $$;

    CREATE OR REPLACE FUNCTION public.driver_vehicle_matches_leg(
      p_driver_id uuid, p_vehicle_category_id text, p_vehicle_model_id text
    ) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
      SELECT EXISTS (
        SELECT 1 FROM vehicles v
        JOIN driver_app_vehicle dav ON dav.vehicle_id = v.id AND dav.driver_id = p_driver_id
        WHERE v.driver_id = p_driver_id AND v.status = 'active' AND v.deleted_at IS NULL
          AND dav.can_receive_jobs IS TRUE
          AND (
            (p_vehicle_model_id IS NOT NULL AND v.model_id = p_vehicle_model_id)
            OR (p_vehicle_model_id IS NULL AND p_vehicle_category_id IS NOT NULL AND v.category_id = p_vehicle_category_id)
          )
      );
    $$;

    CREATE OR REPLACE FUNCTION public.driver_selected_vehicle_matches_leg(
      p_driver_id uuid, p_vehicle_id uuid, p_organization_id uuid,
      p_vehicle_category_id text, p_vehicle_model_id text
    ) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
      SELECT EXISTS (
        SELECT 1 FROM vehicles v
        JOIN driver_app_vehicle dav ON dav.vehicle_id = v.id AND dav.driver_id = p_driver_id
        WHERE v.id = p_vehicle_id AND v.driver_id = p_driver_id
          AND v.organization_id = p_organization_id AND v.deleted_at IS NULL AND v.status = 'active'
          AND dav.can_receive_jobs IS TRUE AND dav.organization_id = p_organization_id
          AND (
            (p_vehicle_model_id IS NOT NULL AND v.model_id = p_vehicle_model_id)
            OR (p_vehicle_model_id IS NULL AND p_vehicle_category_id IS NOT NULL AND v.category_id = p_vehicle_category_id)
          )
      );
    $$;

    CREATE OR REPLACE FUNCTION public.job_leg_is_offerable(p_booking_leg_id uuid)
    RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
      SELECT EXISTS (
        SELECT 1 FROM booking_legs bl
        WHERE bl.id = p_booking_leg_id AND bl.deleted_at IS NULL
          AND bl.status = 'PENDING' AND bl.assigned_driver_id IS NULL
          AND public.booking_parent_is_accept_ready(bl.booking_id)
      );
    $$;

    CREATE OR REPLACE FUNCTION public.cancel_pending_job_available_notifications(p_booking_leg_id uuid)
    RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
    DECLARE v_n integer := 0;
    BEGIN
      UPDATE notification_events
      SET status = 'cancelled', updated_at = now()
      WHERE job_id = p_booking_leg_id AND event_type = 'driver_job_available'
        AND status IN ('pending','ready','failed_retryable','processing');
      GET DIAGNOSTICS v_n = ROW_COUNT;
      RETURN v_n;
    END $$;
  `);

  // Accept + enqueue + start_premium + advance (core Stage1 logic)
  await db.exec(`
    CREATE OR REPLACE FUNCTION public.driver_accept_job(p_leg_id uuid, p_driver_id uuid DEFAULT NULL)
    RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
    DECLARE
      v_caller uuid := auth.uid(); v_driver_id uuid; v_driver_org uuid; v_leg record; v_updated int;
      job_data jsonb;
    BEGIN
      IF v_caller IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Authentication required'); END IF;
      SELECT d.id, d.organization_id INTO v_driver_id, v_driver_org FROM drivers d
      WHERE d.auth_user_id = v_caller AND d.is_active AND d.is_approved AND d.deleted_at IS NULL AND d.status = 'approved';
      IF v_driver_id IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Driver not found or not approved'); END IF;
      IF p_driver_id IS NOT NULL AND p_driver_id IS DISTINCT FROM v_driver_id THEN
        RETURN jsonb_build_object('success', false, 'error', 'Cannot accept as another driver');
      END IF;
      SELECT * INTO v_leg FROM booking_legs WHERE id = p_leg_id AND deleted_at IS NULL FOR UPDATE;
      IF v_leg.id IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Job not found'); END IF;
      IF v_leg.organization_id IS DISTINCT FROM v_driver_org THEN
        RETURN jsonb_build_object('success', false, 'error', 'Organization mismatch');
      END IF;
      IF NOT booking_parent_is_accept_ready(v_leg.booking_id) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Booking not confirmed or payment invalid');
      END IF;
      IF v_leg.status IS DISTINCT FROM 'PENDING' OR v_leg.assigned_driver_id IS NOT NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Job not available for acceptance');
      END IF;
      IF NOT driver_vehicle_matches_leg(v_driver_id, v_leg.vehicle_category_id, v_leg.vehicle_model_id) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Vehicle not eligible for this job');
      END IF;
      IF NOT job_offer_wave_allows_driver(p_leg_id, v_driver_id) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Job reserved for another driver');
      END IF;
      UPDATE booking_legs SET status='ASSIGNED', assigned_driver_id=v_driver_id, assigned_at=now(), updated_at=now()
      WHERE id=p_leg_id AND status='PENDING' AND assigned_driver_id IS NULL AND deleted_at IS NULL;
      GET DIAGNOSTICS v_updated = ROW_COUNT;
      IF v_updated = 0 THEN RETURN jsonb_build_object('success', false, 'error', 'Job not available for acceptance'); END IF;
      UPDATE job_dispatch_runs SET status='accepted', accepted_at=now(), updated_at=now()
      WHERE booking_leg_id=p_leg_id AND status='active';
      PERFORM cancel_pending_job_available_notifications(p_leg_id);
      SELECT jsonb_build_object('job_id', id, 'assigned_driver_id', assigned_driver_id) INTO job_data FROM booking_legs WHERE id=p_leg_id;
      RETURN jsonb_build_object('success', true, 'data', job_data);
    END $$;

    CREATE OR REPLACE FUNCTION public.driver_accept_job(p_driver_id uuid, p_vehicle_id uuid, p_booking_leg_id uuid)
    RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
    DECLARE v_caller uuid := auth.uid(); v_self uuid; v_org uuid; v_leg record; v_updated int;
    BEGIN
      IF v_caller IS NULL THEN RETURN false; END IF;
      SELECT d.id, d.organization_id INTO v_self, v_org FROM drivers d
      WHERE d.auth_user_id = v_caller AND d.deleted_at IS NULL AND d.is_active AND d.is_approved AND d.status='approved';
      IF v_self IS NULL OR v_self IS DISTINCT FROM p_driver_id THEN RETURN false; END IF;
      SELECT * INTO v_leg FROM booking_legs WHERE id=p_booking_leg_id AND deleted_at IS NULL FOR UPDATE;
      IF NOT FOUND OR v_leg.assigned_driver_id IS NOT NULL THEN RETURN false; END IF;
      IF v_leg.organization_id IS DISTINCT FROM v_org THEN RETURN false; END IF;
      IF NOT booking_parent_is_accept_ready(v_leg.booking_id) THEN RETURN false; END IF;
      IF v_leg.status IS DISTINCT FROM 'PENDING' THEN RETURN false; END IF;
      IF NOT job_offer_wave_allows_driver(p_booking_leg_id, p_driver_id) THEN RETURN false; END IF;
      IF NOT driver_selected_vehicle_matches_leg(p_driver_id, p_vehicle_id, v_leg.organization_id, v_leg.vehicle_category_id, v_leg.vehicle_model_id) THEN
        RETURN false;
      END IF;
      UPDATE booking_legs SET assigned_driver_id=p_driver_id, assigned_vehicle_id=p_vehicle_id, status='ASSIGNED', assigned_at=now(), updated_at=now()
      WHERE id=p_booking_leg_id AND status='PENDING' AND assigned_driver_id IS NULL AND deleted_at IS NULL;
      GET DIAGNOSTICS v_updated = ROW_COUNT;
      IF v_updated = 0 THEN RETURN false; END IF;
      UPDATE job_dispatch_runs SET status='accepted', accepted_at=now(), updated_at=now()
      WHERE booking_leg_id=p_booking_leg_id AND status='active';
      PERFORM cancel_pending_job_available_notifications(p_booking_leg_id);
      RETURN true;
    END $$;

    CREATE OR REPLACE FUNCTION public.enqueue_dispatch_wave_notifications(p_booking_leg_id uuid, p_wave text)
    RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
    DECLARE bl record; v_count int := 0; v_driver record;
    BEGIN
      SELECT * INTO bl FROM booking_legs WHERE id=p_booking_leg_id AND deleted_at IS NULL;
      IF bl.id IS NULL THEN RETURN 0; END IF;
      IF NOT dispatch_caller_can_manage_org(bl.organization_id) THEN
        RAISE EXCEPTION 'not authorized' USING ERRCODE='42501';
      END IF;
      IF NOT job_leg_is_offerable(bl.id) THEN RETURN 0; END IF;
      IF p_wave = 'direct' THEN RETURN 0;
      ELSIF p_wave = 'premium' THEN
        FOR v_driver IN
          SELECT pd.driver_id FROM dispatch_premium_drivers pd
          JOIN drivers d ON d.id=pd.driver_id AND d.deleted_at IS NULL AND d.status='approved' AND d.organization_id=bl.organization_id
          WHERE pd.organization_id=bl.organization_id
            AND driver_vehicle_matches_leg(pd.driver_id, bl.vehicle_category_id, bl.vehicle_model_id)
        LOOP
          IF NOT job_leg_is_offerable(bl.id) THEN RETURN v_count; END IF;
          INSERT INTO notification_events(organization_id,event_type,source_module,priority,status,idempotency_key,booking_id,job_id,driver_id,payload)
          VALUES (bl.organization_id,'driver_job_available','dispatch_wave_premium','high','pending',
            format('driver_job_available:wave:premium:%s:%s:%s', bl.organization_id, bl.id, v_driver.driver_id),
            bl.booking_id, bl.id, v_driver.driver_id, jsonb_build_object('dispatch_wave','premium'))
          ON CONFLICT (organization_id, idempotency_key) DO NOTHING;
          IF FOUND THEN v_count := v_count + 1; END IF;
        END LOOP;
      ELSIF p_wave = 'open' THEN
        FOR v_driver IN
          SELECT d.id AS driver_id FROM drivers d
          WHERE d.organization_id=bl.organization_id AND d.deleted_at IS NULL AND d.status='approved'
            AND driver_vehicle_matches_leg(d.id, bl.vehicle_category_id, bl.vehicle_model_id)
            AND NOT EXISTS (
              SELECT 1 FROM notification_events ne
              WHERE ne.job_id=bl.id AND ne.driver_id=d.id AND ne.event_type='driver_job_available'
                AND ne.status IS DISTINCT FROM 'cancelled'
            )
        LOOP
          IF NOT job_leg_is_offerable(bl.id) THEN RETURN v_count; END IF;
          INSERT INTO notification_events(organization_id,event_type,source_module,priority,status,idempotency_key,booking_id,job_id,driver_id,payload)
          VALUES (bl.organization_id,'driver_job_available','dispatch_wave_open','high','pending',
            format('driver_job_available:wave:open:%s:%s:%s', bl.organization_id, bl.id, v_driver.driver_id),
            bl.booking_id, bl.id, v_driver.driver_id, jsonb_build_object('dispatch_wave','open'))
          ON CONFLICT (organization_id, idempotency_key) DO NOTHING;
          IF FOUND THEN v_count := v_count + 1; END IF;
        END LOOP;
      END IF;
      RETURN v_count;
    END $$;

    CREATE OR REPLACE FUNCTION public.start_premium_dispatch_run(p_booking_leg_id uuid, p_actor_id uuid DEFAULT NULL)
    RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
    DECLARE bl record; v_wait int := 10; v_now timestamptz := now(); v_expires timestamptz;
      v_premium_count int := 0; v_n int := 0;
    BEGIN
      SELECT * INTO bl FROM booking_legs WHERE id=p_booking_leg_id AND deleted_at IS NULL;
      IF bl.id IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Leg not found'); END IF;
      IF NOT dispatch_caller_can_manage_org(bl.organization_id) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Not authorized');
      END IF;
      IF bl.status IS DISTINCT FROM 'PENDING' OR bl.assigned_driver_id IS NOT NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Leg not dispatchable');
      END IF;
      IF NOT booking_parent_is_accept_ready(bl.booking_id) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Booking not confirmed or payment invalid');
      END IF;
      IF EXISTS (SELECT 1 FROM job_dispatch_runs r WHERE r.booking_leg_id=bl.id AND r.status='active' AND r.wave='direct') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Direct wave active — not starting Premium');
      END IF;
      SELECT coalesce(premium_wait_minutes,10) INTO v_wait FROM dispatch_org_settings WHERE organization_id=bl.organization_id;
      v_wait := greatest(coalesce(v_wait,10),1);
      v_expires := v_now + make_interval(mins => v_wait);
      SELECT count(*) INTO v_premium_count FROM dispatch_premium_drivers pd
      JOIN drivers d ON d.id=pd.driver_id AND d.deleted_at IS NULL AND d.status='approved'
      WHERE pd.organization_id=bl.organization_id
        AND driver_vehicle_matches_leg(pd.driver_id, bl.vehicle_category_id, bl.vehicle_model_id);
      UPDATE job_dispatch_runs SET status='cancelled', released_at=v_now, updated_at=v_now
      WHERE booking_leg_id=bl.id AND status='active';
      IF v_premium_count = 0 THEN
        INSERT INTO job_dispatch_runs(organization_id,booking_id,booking_leg_id,mode,wave,exclusive_driver_id,status,started_at,created_by,updated_at)
        VALUES (bl.organization_id, bl.booking_id, bl.id, 'waves', 'open', NULL, 'active', v_now, p_actor_id, v_now);
        v_n := enqueue_dispatch_wave_notifications(bl.id, 'open');
        RETURN jsonb_build_object('success', true, 'wave', 'open', 'reason', 'no_eligible_premium_open_immediately', 'notifications', v_n);
      END IF;
      INSERT INTO job_dispatch_runs(organization_id,booking_id,booking_leg_id,mode,wave,exclusive_driver_id,status,started_at,expires_at,created_by,updated_at)
      VALUES (bl.organization_id, bl.booking_id, bl.id, 'waves', 'premium', NULL, 'active', v_now, v_expires, p_actor_id, v_now);
      v_n := enqueue_dispatch_wave_notifications(bl.id, 'premium');
      RETURN jsonb_build_object('success', true, 'wave', 'premium', 'notifications', v_n, 'premium_eligible', v_premium_count);
    END $$;

    CREATE OR REPLACE FUNCTION public.advance_expired_job_dispatch_waves()
    RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
    DECLARE v_run record; v_advanced int := 0; v_notified int := 0; v_n int; v_now timestamptz := now();
    BEGIN
      IF NOT (dispatch_caller_is_backend() OR is_super_admin()) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Not authorized', 'advanced', 0);
      END IF;
      FOR v_run IN
        SELECT r.* FROM job_dispatch_runs r
        JOIN booking_legs bl ON bl.id=r.booking_leg_id
        WHERE r.status='active' AND r.wave='premium' AND r.expires_at IS NOT NULL AND r.expires_at <= v_now
          AND bl.deleted_at IS NULL AND bl.status='PENDING' AND bl.assigned_driver_id IS NULL
        FOR UPDATE OF r
      LOOP
        UPDATE job_dispatch_runs SET status='expired', released_at=v_now, updated_at=v_now WHERE id=v_run.id;
        INSERT INTO job_dispatch_runs(organization_id,booking_id,booking_leg_id,mode,wave,exclusive_driver_id,status,started_at,created_by,updated_at)
        VALUES (v_run.organization_id, v_run.booking_id, v_run.booking_leg_id, coalesce(v_run.mode,'waves'), 'open', NULL, 'active', v_now, v_run.created_by, v_now);
        v_n := enqueue_dispatch_wave_notifications(v_run.booking_leg_id, 'open');
        v_notified := v_notified + coalesce(v_n,0);
        v_advanced := v_advanced + 1;
      END LOOP;
      RETURN jsonb_build_object('success', true, 'advanced', v_advanced, 'notifications', v_notified);
    END $$;

    -- Payment-succeeded enqueue (Direct exclusivity failure safe)
    CREATE OR REPLACE FUNCTION public.enqueue_on_payment(p_booking_id uuid)
    RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
    DECLARE bl record; dispatch record; v_auto boolean := false; v_n int := 0; v_started jsonb;
    BEGIN
      SELECT coalesce(waves_enabled_automatic,false) INTO v_auto
      FROM dispatch_org_settings dos
      JOIN bookings b ON b.organization_id = dos.organization_id
      WHERE b.id = p_booking_id;
      FOR bl IN SELECT * FROM booking_legs WHERE booking_id=p_booking_id AND status='PENDING' AND assigned_driver_id IS NULL AND deleted_at IS NULL
      LOOP
        SELECT r.wave, r.exclusive_driver_id INTO dispatch
        FROM job_dispatch_runs r WHERE r.booking_leg_id=bl.id AND r.status='active'
        ORDER BY r.started_at DESC LIMIT 1;
        IF dispatch.wave = 'direct' THEN
          IF dispatch.exclusive_driver_id IS NULL THEN CONTINUE; END IF;
          IF NOT job_leg_is_offerable(bl.id) THEN CONTINUE; END IF;
          INSERT INTO notification_events(organization_id,event_type,source_module,priority,status,idempotency_key,booking_id,job_id,driver_id,payload)
          VALUES (bl.organization_id,'driver_job_available','dispatch_payment_succeeded','high','pending',
            format('driver_job_available:payment_succeeded:%s:%s', bl.organization_id, bl.id),
            bl.booking_id, bl.id, dispatch.exclusive_driver_id, jsonb_build_object('dispatch_wave','direct','exclusive_driver_id',dispatch.exclusive_driver_id))
          ON CONFLICT DO NOTHING;
          IF FOUND THEN v_n := v_n + 1; END IF;
          CONTINUE;
        END IF;
        IF coalesce(v_auto,false) THEN
          v_started := start_premium_dispatch_run(bl.id, NULL);
          CONTINUE;
        END IF;
      END LOOP;
      RETURN v_n;
    END $$;
  `);

  // Fake provider
  const fakeProvider = {
    sends: [],
    async send(event) {
      if (!(await db.query(`SELECT job_leg_is_offerable($1) AS ok`, [event.job_id])).rows[0].ok) {
        await db.query(
          `UPDATE notification_events SET status='cancelled', updated_at=now() WHERE id=$1`,
          [event.id]
        );
        return { skipped: true, reason: 'not_offerable' };
      }
      const deliveryId = crypto.randomUUID();
      await db.query(
        `INSERT INTO notification_deliveries(id,organization_id,event_id,recipient_id,channel,provider,status,provider_message_id)
         VALUES ($1,$2,$3,$4,'push','fake','provider_accepted',$5)`,
        [deliveryId, event.organization_id, event.id, event.driver_id, `fake-${deliveryId}`]
      );
      await db.query(
        `UPDATE notification_events SET status='delivered', updated_at=now() WHERE id=$1`,
        [event.id]
      );
      this.sends.push({ eventId: event.id, driverId: event.driver_id, deliveryId });
      return { ok: true, deliveryId };
    },
  };

  // Fictional IDs
  const ORG = '11111111-1111-1111-1111-111111111111';
  const ORG2 = '22222222-2222-2222-2222-222222222222';
  const AUTH_ADMIN = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  const AUTH_OP = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
  const AUTH_MEMBER = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
  const AUTH_DRIVER_A = 'dddddddd-dddd-dddd-dddd-dddddddddddd';
  const AUTH_DRIVER_B = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';
  const AUTH_DRIVER_P = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa003';
  const AUTH_OTHER_ORG = 'ffffffff-ffff-ffff-ffff-ffffffffffff';
  const DRIVER_A = 'a0000000-0000-0000-0000-000000000001';
  const DRIVER_B = 'a0000000-0000-0000-0000-000000000002';
  const DRIVER_P = 'a0000000-0000-0000-0000-000000000003';
  const VEH_A = 'b0000000-0000-0000-0000-000000000001';
  const VEH_A_BAD = 'b0000000-0000-0000-0000-000000000099';
  const VEH_B = 'b0000000-0000-0000-0000-000000000002';
  const VEH_P = 'b0000000-0000-0000-0000-000000000003';
  const BOOK = 'c0000000-0000-0000-0000-000000000001';
  const LEG = 'd0000000-0000-0000-0000-000000000001';

  async function asJwt(sub, role = 'authenticated') {
    await db.query(`SELECT set_config('request.jwt.claim.sub', $1, false)`, [sub || '']);
    await db.query(`SELECT set_config('request.jwt.claim.role', $1, false)`, [role || '']);
  }
  async function asService() {
    await asJwt('', 'service_role');
  }
  async function clearJwt() {
    await db.query(`SELECT set_config('request.jwt.claim.sub', '', false)`);
    await db.query(`SELECT set_config('request.jwt.claim.role', '', false)`);
  }

  await db.exec(`
    INSERT INTO organizations(id,name) VALUES ('${ORG}','Iso Org'), ('${ORG2}','Other Org');
    INSERT INTO auth.users(id,is_super_admin) VALUES
      ('${AUTH_ADMIN}', false), ('${AUTH_OP}', false), ('${AUTH_MEMBER}', false),
      ('${AUTH_DRIVER_A}', false), ('${AUTH_DRIVER_B}', false), ('${AUTH_DRIVER_P}', false),
      ('${AUTH_OTHER_ORG}', false);
    INSERT INTO organization_members VALUES
      ('${ORG}','${AUTH_ADMIN}','admin'),
      ('${ORG}','${AUTH_OP}','operator'),
      ('${ORG}','${AUTH_MEMBER}','member'),
      ('${ORG2}','${AUTH_OTHER_ORG}','admin');
    INSERT INTO drivers(id,auth_user_id,organization_id) VALUES
      ('${DRIVER_A}','${AUTH_DRIVER_A}','${ORG}'),
      ('${DRIVER_B}','${AUTH_DRIVER_B}','${ORG}'),
      ('${DRIVER_P}','${AUTH_DRIVER_P}','${ORG}');
    INSERT INTO vehicles(id,driver_id,organization_id,model_id,category_id) VALUES
      ('${VEH_A}','${DRIVER_A}','${ORG}','mercedes-e-class','executive'),
      ('${VEH_A_BAD}','${DRIVER_A}','${ORG}','bmw-5','executive'),
      ('${VEH_B}','${DRIVER_B}','${ORG}','mercedes-e-class','executive'),
      ('${VEH_P}','${DRIVER_P}','${ORG}','mercedes-e-class','executive');
    INSERT INTO driver_app_vehicle VALUES
      ('${VEH_A}','${DRIVER_A}','${ORG}', true),
      ('${VEH_A_BAD}','${DRIVER_A}','${ORG}', false),
      ('${VEH_B}','${DRIVER_B}','${ORG}', true),
      ('${VEH_P}','${DRIVER_P}','${ORG}', true);
    INSERT INTO dispatch_org_settings(organization_id,premium_wait_minutes,waves_enabled_automatic)
    VALUES ('${ORG}', 10, true);
    INSERT INTO dispatch_premium_drivers VALUES ('${ORG}','${DRIVER_P}');
  `);

  async function seedJob({ legId = LEG, bookId = BOOK, model = 'mercedes-e-class' } = {}) {
    await db.query(`DELETE FROM notification_deliveries`);
    await db.query(`DELETE FROM notification_events`);
    await db.query(`DELETE FROM job_dispatch_runs`);
    await db.query(`DELETE FROM booking_payments`);
    await db.query(`DELETE FROM booking_legs`);
    await db.query(`DELETE FROM bookings`);
    await db.query(
      `INSERT INTO bookings(id,organization_id,reference,status) VALUES ($1,$2,'ISO-001','CONFIRMED')`,
      [bookId, ORG]
    );
    await db.query(
      `INSERT INTO booking_payments(booking_id,organization_id,status) VALUES ($1,$2,'succeeded')`,
      [bookId, ORG]
    );
    await db.query(
      `INSERT INTO booking_legs(id,booking_id,organization_id,status,vehicle_category_id,vehicle_model_id,scheduled_at)
       VALUES ($1,$2,$3,'PENDING','executive',$4, now() + interval '2 hours')`,
      [legId, bookId, ORG, model]
    );
  }

  // ---------- TESTS ----------

  await check('Auth: driver cannot start_premium (SECURITY DEFINER no escalate)', async () => {
    await seedJob();
    await asJwt(AUTH_DRIVER_A, 'authenticated');
    const r = await db.query(`SELECT start_premium_dispatch_run($1::uuid) AS j`, [LEG]);
    assert.equal(r.rows[0].j.success, false);
    assert.match(r.rows[0].j.error, /Not authorized/i);
  });

  await check('Auth: member (no admin/operator) denied start_premium', async () => {
    await seedJob();
    await asJwt(AUTH_MEMBER, 'authenticated');
    const r = await db.query(`SELECT start_premium_dispatch_run($1::uuid) AS j`, [LEG]);
    assert.equal(r.rows[0].j.success, false);
  });

  await check('Auth: other-org admin denied', async () => {
    await seedJob();
    await asJwt(AUTH_OTHER_ORG, 'authenticated');
    const r = await db.query(`SELECT start_premium_dispatch_run($1::uuid) AS j`, [LEG]);
    assert.equal(r.rows[0].j.success, false);
  });

  await check('Auth: operator of org allowed', async () => {
    await seedJob();
    await asJwt(AUTH_OP, 'authenticated');
    const r = await db.query(`SELECT start_premium_dispatch_run($1::uuid) AS j`, [LEG]);
    assert.equal(r.rows[0].j.success, true);
    assert.equal(r.rows[0].j.wave, 'premium');
  });

  await check('Auth: advance denied for authenticated driver', async () => {
    await seedJob();
    await asService();
    await db.query(`SELECT start_premium_dispatch_run($1::uuid)`, [LEG]);
    await db.query(
      `UPDATE job_dispatch_runs SET expires_at = now() - interval '1 minute' WHERE booking_leg_id=$1 AND wave='premium'`,
      [LEG]
    );
    await asJwt(AUTH_DRIVER_A, 'authenticated');
    const r = await db.query(`SELECT advance_expired_job_dispatch_waves() AS j`);
    assert.equal(r.rows[0].j.success, false);
  });

  await check('Vehicle: can_receive_jobs=false excluded from match', async () => {
    await asService();
    // Only bad vehicle would match model bmw — A_BAD has can_receive false
    const r = await db.query(
      `SELECT driver_vehicle_matches_leg($1::uuid,'executive','bmw-5') AS ok`,
      [DRIVER_A]
    );
    assert.equal(r.rows[0].ok, false);
    const ok = await db.query(
      `SELECT driver_vehicle_matches_leg($1::uuid,'executive','mercedes-e-class') AS ok`,
      [DRIVER_A]
    );
    assert.equal(ok.rows[0].ok, true);
  });

  await check('Accept vehicle_id rejects ineligible selected car', async () => {
    await seedJob();
    await asService();
    await db.query(
      `INSERT INTO job_dispatch_runs(organization_id,booking_id,booking_leg_id,mode,wave,status,started_at)
       VALUES ($1,$2,$3,'waves','open','active',now())`,
      [ORG, BOOK, LEG]
    );
    await asJwt(AUTH_DRIVER_A);
    const bad = await db.query(
      `SELECT driver_accept_job($1::uuid,$2::uuid,$3::uuid) AS ok`,
      [DRIVER_A, VEH_A_BAD, LEG]
    );
    assert.equal(bad.rows[0].ok, false);
    const good = await db.query(
      `SELECT driver_accept_job($1::uuid,$2::uuid,$3::uuid) AS ok`,
      [DRIVER_A, VEH_A, LEG]
    );
    assert.equal(good.rows[0].ok, true);
  });

  await check('Admin New Job path: Direct + payment → single notify', async () => {
    await seedJob();
    await asService();
    await db.query(
      `INSERT INTO job_dispatch_runs(organization_id,booking_id,booking_leg_id,mode,wave,exclusive_driver_id,status,started_at)
       VALUES ($1,$2,$3,'direct','direct',$4,'active',now())`,
      [ORG, BOOK, LEG, DRIVER_A]
    );
    const n = await db.query(`SELECT enqueue_on_payment($1::uuid) AS n`, [BOOK]);
    assert.equal(n.rows[0].n, 1);
    const ev = await db.query(
      `SELECT driver_id, payload->>'dispatch_wave' AS wave FROM notification_events WHERE job_id=$1`,
      [LEG]
    );
    assert.equal(ev.rows.length, 1);
    assert.equal(ev.rows[0].driver_id, DRIVER_A);
    assert.equal(ev.rows[0].wave, 'direct');
    const events = await db.query(`SELECT * FROM notification_events WHERE job_id=$1`, [LEG]);
    await fakeProvider.send(events.rows[0]);
    assert.equal(fakeProvider.sends.at(-1).driverId, DRIVER_A);
  });

  await check('Direct exclusivity save failure → zero notifies (no fan-out)', async () => {
    await seedJob({ legId: 'd0000000-0000-0000-0000-000000000010', bookId: 'c0000000-0000-0000-0000-000000000010' });
    const LEG2 = 'd0000000-0000-0000-0000-000000000010';
    const BOOK2 = 'c0000000-0000-0000-0000-000000000010';
    await asService();
    await db.query(
      `INSERT INTO job_dispatch_runs(organization_id,booking_id,booking_leg_id,mode,wave,exclusive_driver_id,status,started_at)
       VALUES ($1,$2,$3,'direct','direct',NULL,'active',now())`,
      [ORG, BOOK2, LEG2]
    );
    const n = await db.query(`SELECT enqueue_on_payment($1::uuid) AS n`, [BOOK2]);
    assert.equal(n.rows[0].n, 0);
    const c = await db.query(`SELECT count(*)::int AS c FROM notification_events WHERE job_id=$1`, [LEG2]);
    assert.equal(c.rows[0].c, 0);
  });

  await check('Premium wave notifies only premium+eligible', async () => {
    await seedJob();
    await asService();
    const r = await db.query(`SELECT start_premium_dispatch_run($1::uuid) AS j`, [LEG]);
    assert.equal(r.rows[0].j.success, true);
    assert.equal(r.rows[0].j.wave, 'premium');
    const ev = await db.query(
      `SELECT driver_id FROM notification_events WHERE job_id=$1 AND source_module='dispatch_wave_premium'`,
      [LEG]
    );
    assert.deepEqual(ev.rows.map((x) => x.driver_id), [DRIVER_P]);
  });

  await check('Open after expiry notifies unnotified (not Premium P again)', async () => {
    await seedJob();
    await asService();
    await db.query(`SELECT start_premium_dispatch_run($1::uuid)`, [LEG]);
    await db.query(
      `UPDATE job_dispatch_runs SET expires_at = now() - interval '1 minute' WHERE booking_leg_id=$1 AND wave='premium'`,
      [LEG]
    );
    const adv = await db.query(`SELECT advance_expired_job_dispatch_waves() AS j`);
    assert.equal(adv.rows[0].j.success, true);
    assert.ok(adv.rows[0].j.advanced >= 1);
    const open = await db.query(
      `SELECT driver_id FROM notification_events WHERE job_id=$1 AND source_module='dispatch_wave_open' ORDER BY driver_id`,
      [LEG]
    );
    const ids = open.rows.map((x) => x.driver_id).sort();
    assert.ok(ids.includes(DRIVER_A));
    assert.ok(ids.includes(DRIVER_B));
    assert.ok(!ids.includes(DRIVER_P));
  });

  await check('Empty Premium → Open immediately (Option A)', async () => {
    await seedJob({ legId: 'd0000000-0000-0000-0000-000000000020', bookId: 'c0000000-0000-0000-0000-000000000020' });
    const LEG3 = 'd0000000-0000-0000-0000-000000000020';
    await asService();
    await db.query(`DELETE FROM dispatch_premium_drivers WHERE organization_id=$1`, [ORG]);
    const r = await db.query(`SELECT start_premium_dispatch_run($1::uuid) AS j`, [LEG3]);
    assert.equal(r.rows[0].j.success, true);
    assert.equal(r.rows[0].j.wave, 'open');
    const run = await db.query(
      `SELECT wave, status FROM job_dispatch_runs WHERE booking_leg_id=$1 AND status='active'`,
      [LEG3]
    );
    assert.equal(run.rows[0].wave, 'open');
    // restore premium list for later tests
    await db.query(`INSERT INTO dispatch_premium_drivers VALUES ($1,$2) ON CONFLICT DO NOTHING`, [
      ORG,
      DRIVER_P,
    ]);
  });

  await check('Simultaneous accept: two auth identities → one winner', async () => {
    await seedJob();
    await asService();
    await db.query(
      `INSERT INTO job_dispatch_runs(organization_id,booking_id,booking_leg_id,mode,wave,status,started_at)
       VALUES ($1,$2,$3,'waves','open','active',now())`,
      [ORG, BOOK, LEG]
    );
    // Sequential CAS in one DB connection still models atomic WHERE; true parallel needs 2 sessions.
    await asJwt(AUTH_DRIVER_A);
    const a = await db.query(`SELECT driver_accept_job($1::uuid) AS j`, [LEG]);
    await asJwt(AUTH_DRIVER_B);
    const b = await db.query(`SELECT driver_accept_job($1::uuid) AS j`, [LEG]);
    assert.equal(a.rows[0].j.success, true);
    assert.equal(b.rows[0].j.success, false);
    const leg = await db.query(`SELECT assigned_driver_id FROM booking_legs WHERE id=$1`, [LEG]);
    assert.equal(leg.rows[0].assigned_driver_id, DRIVER_A);
  });

  await check('Accept cancels pending/retryable notifies; retry skipped', async () => {
    await seedJob();
    await asService();
    await db.query(`SELECT start_premium_dispatch_run($1::uuid)`, [LEG]);
    await db.query(
      `UPDATE job_dispatch_runs SET expires_at=now()-interval '1 minute' WHERE booking_leg_id=$1`,
      [LEG]
    );
    await db.query(`SELECT advance_expired_job_dispatch_waves()`);
    const before = await db.query(
      `SELECT id, driver_id, status FROM notification_events WHERE job_id=$1 AND status='pending'`,
      [LEG]
    );
    assert.ok(before.rows.length >= 1);
    // mark one failed_retryable to simulate retry queue
    await db.query(
      `UPDATE notification_events SET status='failed_retryable', next_retry_at=now() WHERE id=$1`,
      [before.rows[0].id]
    );
    await asJwt(AUTH_DRIVER_A);
    const acc = await db.query(`SELECT driver_accept_job($1::uuid) AS j`, [LEG]);
    assert.equal(acc.rows[0].j.success, true);
    const left = await db.query(
      `SELECT status, count(*)::int AS c FROM notification_events WHERE job_id=$1 GROUP BY 1`,
      [LEG]
    );
    const byStatus = Object.fromEntries(left.rows.map((r) => [r.status, r.c]));
    assert.ok((byStatus.cancelled || 0) >= 1);
    assert.equal(byStatus.pending || 0, 0);
    assert.equal(byStatus.failed_retryable || 0, 0);
    // fake provider retry attempt must skip
    const retry = await fakeProvider.send({
      id: before.rows[0].id,
      job_id: LEG,
      organization_id: ORG,
      driver_id: before.rows[0].driver_id,
    });
    assert.equal(retry.skipped, true);
  });

  // True 2-session concurrent lock: PGlite single connection limitation
  skip(
    'True parallel 2-session FOR UPDATE race on separate connections',
    'PGlite single-process; sequential CAS covered above. Needs staging Postgres with 2 sessions.'
  );
  skip(
    'Supabase branch apply of full VL NEW schema',
    'create_branch requires paid cost confirmation; not approved in this run'
  );
  skip(
    'Admin UI HTTP New Job against Render',
    'No staging Admin URL / no deploy; covered via Direct+payment SQL path'
  );

  console.log('\n=== SUMMARY ===');
  console.log(`passed=${results.passed.length} failed=${results.failed.length} skipped=${results.skipped.length}`);
  if (results.failed.length) {
    for (const f of results.failed) console.log('  FAIL detail:', f.name, f.error);
    process.exitCode = 1;
  }
  // machine-readable for report
  const fs = await import('node:fs');
  fs.writeFileSync(
    new URL('./LAST_RUN.json', import.meta.url),
    JSON.stringify(results, null, 2)
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
