-- Admin Realtime on driver inbox rows
DROP POLICY IF EXISTS notifications_org_member_select ON public.notifications;
CREATE POLICY notifications_org_member_select
  ON public.notifications
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.drivers d
      WHERE d.auth_user_id = notifications.user_id
        AND d.deleted_at IS NULL
        AND public.is_org_member(d.organization_id)
    )
  );
