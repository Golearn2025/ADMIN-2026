CREATE TABLE IF NOT EXISTS public.dispatch_org_settings (
  organization_id uuid PRIMARY KEY REFERENCES public.organizations(id) ON DELETE CASCADE,
  waves_enabled_manual boolean NOT NULL DEFAULT true,
  waves_enabled_automatic boolean NOT NULL DEFAULT false,
  default_manual_mode text NOT NULL DEFAULT 'open'
    CHECK (default_manual_mode IN ('open', 'direct', 'waves')),
  direct_wait_minutes integer NOT NULL DEFAULT 10 CHECK (direct_wait_minutes BETWEEN 1 AND 240),
  premium_wait_minutes integer NOT NULL DEFAULT 10 CHECK (premium_wait_minutes BETWEEN 1 AND 240),
  -- Direct→Premium is manual by product decision; Premium→Open uses premium_wait_minutes.
  direct_to_premium_manual boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.dispatch_premium_drivers (
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  driver_id uuid NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NULL,
  PRIMARY KEY (organization_id, driver_id)
);

CREATE INDEX IF NOT EXISTS idx_dispatch_premium_drivers_driver
  ON public.dispatch_premium_drivers (driver_id);

COMMENT ON TABLE public.dispatch_org_settings IS
  'Job dispatch wave settings per org. Automatic site stays Open until waves_enabled_automatic=true.';
COMMENT ON TABLE public.dispatch_premium_drivers IS
  'Manual premium driver list for dispatch wave 2. Not derived from rating_tier.';

INSERT INTO public.dispatch_org_settings (organization_id)
VALUES ('9a5caade-4791-4860-93b5-12b1c4fa9830')
ON CONFLICT (organization_id) DO NOTHING;
