-- Representative schema so Stage1 migrations 600/601/602 can load verbatim.
-- Isolated local PG / PGlite only — NOT production.

DO $$ BEGIN
  CREATE ROLE anon NOLOGIN;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE ROLE authenticated NOLOGIN;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE ROLE service_role NOLOGIN BYPASSRLS;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE SCHEMA IF NOT EXISTS auth;

CREATE TABLE IF NOT EXISTS auth.users (
  id uuid PRIMARY KEY,
  is_super_admin boolean NOT NULL DEFAULT false
);

CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid
LANGUAGE sql STABLE AS $$
  SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;

CREATE OR REPLACE FUNCTION auth.role() RETURNS text
LANGUAGE sql STABLE AS $$
  SELECT coalesce(nullif(current_setting('request.jwt.claim.role', true), ''), 'authenticated')
$$;

DO $$ BEGIN
  CREATE TYPE public.booking_status AS ENUM (
    'NEW','CONFIRMED','IN_PROGRESS','COMPLETED','CANCELLED',
    'PENDING_PAYMENT','PAYMENT_FAILED','AWAITING_INVOICE_PAYMENT','AWAITING_INVOICE_CONFIRM'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.leg_status AS ENUM (
    'PENDING','ASSIGNED','ACCEPTED','IN_PROGRESS','COMPLETED','CANCELLED'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.payment_status AS ENUM (
    'unpaid','pending','succeeded','failed','refunded','canceled'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.booking_type AS ENUM (
    'oneway','return','hourly','daily','fleet','transfer'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.organizations (
  id uuid PRIMARY KEY,
  name text
);

CREATE TABLE IF NOT EXISTS public.organization_members (
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  role text NOT NULL,
  PRIMARY KEY (organization_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.drivers (
  id uuid PRIMARY KEY,
  auth_user_id uuid,
  organization_id uuid REFERENCES public.organizations(id),
  status text NOT NULL DEFAULT 'approved',
  is_active boolean NOT NULL DEFAULT true,
  is_approved boolean NOT NULL DEFAULT true,
  deleted_at timestamptz,
  first_name text,
  last_name text
);

CREATE TABLE IF NOT EXISTS public.vehicles (
  id uuid PRIMARY KEY,
  driver_id uuid REFERENCES public.drivers(id),
  organization_id uuid REFERENCES public.organizations(id),
  model_id text,
  category_id text,
  status text NOT NULL DEFAULT 'active',
  year int DEFAULT 2024,
  deleted_at timestamptz
);

-- Table stand-in for live view driver_app_vehicle (same columns Stage1 uses)
CREATE TABLE IF NOT EXISTS public.driver_app_vehicle (
  vehicle_id uuid NOT NULL,
  driver_id uuid NOT NULL,
  organization_id uuid,
  can_receive_jobs boolean,
  PRIMARY KEY (vehicle_id, driver_id)
);

CREATE TABLE IF NOT EXISTS public.bookings (
  id uuid PRIMARY KEY,
  organization_id uuid REFERENCES public.organizations(id),
  reference text,
  booking_type public.booking_type NOT NULL DEFAULT 'transfer',
  currency text DEFAULT 'GBP',
  status public.booking_status NOT NULL,
  deleted_at timestamptz,
  passenger_count int,
  bag_count int,
  custom_requirements text,
  hours_requested numeric,
  days_requested numeric,
  end_at timestamptz,
  trip_configuration_raw jsonb DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS public.booking_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid REFERENCES public.bookings(id),
  organization_id uuid,
  status public.payment_status NOT NULL,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.booking_legs (
  id uuid PRIMARY KEY,
  booking_id uuid REFERENCES public.bookings(id),
  organization_id uuid REFERENCES public.organizations(id),
  status public.leg_status NOT NULL DEFAULT 'PENDING',
  assigned_driver_id uuid,
  assigned_vehicle_id uuid,
  assigned_at timestamptz,
  vehicle_category_id text,
  vehicle_model_id text,
  leg_kind text DEFAULT 'outbound',
  leg_number int DEFAULT 1,
  scheduled_at timestamptz DEFAULT now(),
  pickup_lat numeric,
  pickup_lng numeric,
  dropoff_lat numeric,
  dropoff_lng numeric,
  distance_miles numeric,
  duration_min int,
  flight_number text,
  preferences jsonb,
  stops_raw jsonb DEFAULT '[]'::jsonb,
  addons jsonb DEFAULT '[]'::jsonb,
  deleted_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.job_dispatch_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  booking_id uuid NOT NULL REFERENCES public.bookings(id),
  booking_leg_id uuid NOT NULL REFERENCES public.booking_legs(id),
  mode text NOT NULL CHECK (mode IN ('open', 'direct', 'waves')),
  wave text NOT NULL CHECK (wave IN ('direct', 'premium', 'open')),
  exclusive_driver_id uuid NULL REFERENCES public.drivers(id),
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'accepted', 'released', 'expired', 'cancelled')),
  started_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NULL,
  accepted_at timestamptz NULL,
  released_at timestamptz NULL,
  created_by uuid NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_job_dispatch_runs_active_leg
  ON public.job_dispatch_runs (booking_leg_id)
  WHERE status = 'active';

CREATE TABLE IF NOT EXISTS public.dispatch_premium_drivers (
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  driver_id uuid NOT NULL REFERENCES public.drivers(id),
  PRIMARY KEY (organization_id, driver_id)
);

CREATE TABLE IF NOT EXISTS public.dispatch_org_settings (
  organization_id uuid PRIMARY KEY REFERENCES public.organizations(id),
  premium_wait_minutes int DEFAULT 10,
  direct_wait_minutes int DEFAULT 10,
  waves_enabled_manual boolean NOT NULL DEFAULT true,
  waves_enabled_automatic boolean NOT NULL DEFAULT false
);

CREATE TABLE IF NOT EXISTS public.notification_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  event_type text NOT NULL,
  source_module text,
  priority text,
  status text NOT NULL DEFAULT 'pending',
  idempotency_key text,
  booking_id uuid,
  job_id uuid,
  driver_id uuid,
  customer_id uuid,
  payload jsonb DEFAULT '{}'::jsonb,
  next_retry_at timestamptz,
  retry_count int DEFAULT 0,
  processing_started_at timestamptz,
  processed_at timestamptz,
  failed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (organization_id, idempotency_key)
);

CREATE TABLE IF NOT EXISTS public.notification_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid,
  event_id uuid,
  recipient_id uuid,
  recipient_type text,
  recipient_selection text,
  channel text,
  provider text,
  status text,
  provider_message_id text,
  next_retry_at timestamptz,
  attempt_no int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.service_items (
  id text PRIMARY KEY,
  name text,
  item_group text,
  display_order int DEFAULT 0,
  is_active boolean DEFAULT true
);

CREATE OR REPLACE FUNCTION public.is_service_role() RETURNS boolean
LANGUAGE sql STABLE AS $$
  SELECT coalesce(current_setting('request.jwt.claim.role', true), '') = 'service_role'
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND is_super_admin)
$$;

CREATE OR REPLACE FUNCTION public.has_org_role(p_org uuid, p_roles text[]) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT public.is_super_admin()
    OR EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = p_org AND om.user_id = auth.uid() AND om.role = ANY(p_roles)
    )
$$;

CREATE OR REPLACE FUNCTION public.is_org_member(p_org uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT public.is_super_admin()
    OR EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = p_org AND om.user_id = auth.uid()
    )
$$;

CREATE OR REPLACE FUNCTION public.job_offer_wave_allows_driver(p_leg_id uuid, p_driver_id uuid)
RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE
  v_wave text;
  v_exclusive uuid;
  v_org uuid;
BEGIN
  IF p_leg_id IS NULL OR p_driver_id IS NULL THEN RETURN false; END IF;
  SELECT r.wave, r.exclusive_driver_id, r.organization_id
    INTO v_wave, v_exclusive, v_org
  FROM public.job_dispatch_runs r
  WHERE r.booking_leg_id = p_leg_id AND r.status = 'active'
  ORDER BY r.started_at DESC LIMIT 1;
  IF v_wave IS NULL OR v_wave = 'open' THEN RETURN true; END IF;
  IF v_wave = 'direct' THEN
    RETURN v_exclusive IS NOT NULL AND v_exclusive = p_driver_id;
  END IF;
  IF v_wave = 'premium' THEN
    RETURN EXISTS (
      SELECT 1 FROM public.dispatch_premium_drivers pd
      WHERE pd.organization_id = v_org AND pd.driver_id = p_driver_id
    );
  END IF;
  RETURN true;
END;
$function$;

CREATE OR REPLACE FUNCTION public.format_location_preview(j jsonb) RETURNS text
LANGUAGE sql IMMUTABLE AS $$ SELECT coalesce(j->>'preview', j->>'area', 'Loc') $$;

CREATE OR REPLACE FUNCTION public.driver_offer_base_payout_for_leg(a uuid, b timestamptz, c uuid)
RETURNS int LANGUAGE sql STABLE AS $$ SELECT 1000 $$;

CREATE OR REPLACE FUNCTION public.sum_paid_upgrades_driver_pence(a jsonb, b jsonb)
RETURNS int LANGUAGE sql STABLE AS $$ SELECT 0 $$;

CREATE OR REPLACE FUNCTION public.driver_payout_display_label(p int)
RETURNS text LANGUAGE sql IMMUTABLE AS $$ SELECT '£' || (coalesce(p,0)/100.0)::text $$;

CREATE OR REPLACE FUNCTION public.resolve_driver_payout_tier_group(a text, b numeric, c numeric)
RETURNS text LANGUAGE sql IMMUTABLE AS $$ SELECT 'standard' $$;

CREATE OR REPLACE FUNCTION public.resolve_payout_tier_factor(a timestamptz, b uuid, c text, d text)
RETURNS numeric LANGUAGE sql IMMUTABLE AS $$ SELECT 1.0 $$;

CREATE OR REPLACE FUNCTION public.enrich_paid_upgrades_enriched(a jsonb, b jsonb)
RETURNS jsonb LANGUAGE sql IMMUTABLE AS $$ SELECT '[]'::jsonb $$;
