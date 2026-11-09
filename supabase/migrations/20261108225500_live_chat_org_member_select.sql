-- Allow org members (admin) to SELECT live chat for Realtime + UI.
DROP POLICY IF EXISTS live_chat_sessions_org_select ON public.live_chat_sessions;
CREATE POLICY live_chat_sessions_org_select
  ON public.live_chat_sessions
  FOR SELECT
  TO authenticated
  USING (public.is_org_member(organization_id));

DROP POLICY IF EXISTS live_chat_messages_org_select ON public.live_chat_messages;
CREATE POLICY live_chat_messages_org_select
  ON public.live_chat_messages
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.live_chat_sessions s
      WHERE s.id = live_chat_messages.session_id
        AND public.is_org_member(s.organization_id)
    )
  );
