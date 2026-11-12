-- Phase 3: exclusive Direct offers (accept flow, not force-assign)
-- Companion to remote apply_migration job_dispatch_runs_direct_exclusive_offers_v1
-- + job_dispatch_direct_notify_and_accept_guard_v1

CREATE TABLE IF NOT EXISTS public.job_dispatch_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  booking_leg_id uuid NOT NULL REFERENCES public.booking_legs(id) ON DELETE CASCADE,
  mode text NOT NULL CHECK (mode IN ('open', 'direct', 'waves')),
  wave text NOT NULL CHECK (wave IN ('direct', 'premium', 'open')),
  exclusive_driver_id uuid NULL REFERENCES public.drivers(id) ON DELETE SET NULL,
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

CREATE OR REPLACE FUNCTION public.job_offer_wave_allows_driver(p_leg_id uuid, p_driver_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_wave text;
  v_exclusive uuid;
  v_org uuid;
BEGIN
  IF p_leg_id IS NULL OR p_driver_id IS NULL THEN
    RETURN false;
  END IF;

  SELECT r.wave, r.exclusive_driver_id, r.organization_id
    INTO v_wave, v_exclusive, v_org
  FROM public.job_dispatch_runs r
  WHERE r.booking_leg_id = p_leg_id
    AND r.status = 'active'
  ORDER BY r.started_at DESC
  LIMIT 1;

  IF v_wave IS NULL OR v_wave = 'open' THEN
    RETURN true;
  END IF;

  IF v_wave = 'direct' THEN
    RETURN v_exclusive IS NOT NULL AND v_exclusive = p_driver_id;
  END IF;

  IF v_wave = 'premium' THEN
    RETURN EXISTS (
      SELECT 1
      FROM public.dispatch_premium_drivers pd
      WHERE pd.organization_id = v_org
        AND pd.driver_id = p_driver_id
    );
  END IF;

  RETURN true;
END;
$function$;

-- View rewrites + notify/accept guards were applied remotely via MCP.
-- Keep this file as schema documentation for job_dispatch_runs + helper.
