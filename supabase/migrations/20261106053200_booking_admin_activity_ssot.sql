-- Admin ops activity log (SSOT) for assign / status / cancel / etc.
CREATE TABLE IF NOT EXISTS public.booking_admin_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings(id),
  booking_leg_id uuid NULL REFERENCES public.booking_legs(id),
  organization_id uuid NULL REFERENCES public.organizations(id),
  action_type text NOT NULL,
  reason_code text NULL,
  reason_text text NULL,
  from_value jsonb NULL,
  to_value jsonb NULL,
  actor_user_id uuid NULL,
  actor_email text NULL,
  actor_name text NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_booking_admin_activity_booking_id_created
  ON public.booking_admin_activity (booking_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_booking_admin_activity_org_created
  ON public.booking_admin_activity (organization_id, created_at DESC);

COMMENT ON TABLE public.booking_admin_activity IS
  'SSOT audit trail for admin booking ops (assign/reassign, status, cancel). Read via admin_booking_activity view.';

ALTER TABLE public.booking_admin_activity ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_all_booking_admin_activity" ON public.booking_admin_activity;
CREATE POLICY "service_role_all_booking_admin_activity"
  ON public.booking_admin_activity
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_read_booking_admin_activity" ON public.booking_admin_activity;
CREATE POLICY "authenticated_read_booking_admin_activity"
  ON public.booking_admin_activity
  FOR SELECT
  TO authenticated
  USING (true);

CREATE OR REPLACE VIEW public.admin_booking_activity AS
SELECT
  a.id,
  a.booking_id,
  a.booking_leg_id,
  a.organization_id,
  b.reference AS booking_reference,
  a.action_type,
  a.reason_code,
  a.reason_text,
  a.from_value,
  a.to_value,
  a.actor_user_id,
  a.actor_email,
  a.actor_name,
  a.metadata,
  a.created_at
FROM public.booking_admin_activity a
JOIN public.bookings b ON b.id = a.booking_id
WHERE b.deleted_at IS NULL;

COMMENT ON VIEW public.admin_booking_activity IS
  'SSOT read model for admin booking activity timeline.';
