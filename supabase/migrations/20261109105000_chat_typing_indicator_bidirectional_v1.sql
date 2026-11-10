-- Bidirectional typing (driver <-> operator). Old table had PK(session_id) only
-- so one side overwrote the other, no user_type, and was not in realtime publication.

DROP TABLE IF EXISTS public.chat_typing_indicator CASCADE;

CREATE TABLE public.chat_typing_indicator (
  session_id uuid NOT NULL REFERENCES public.live_chat_sessions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  user_type text NOT NULL CHECK (user_type IN ('driver', 'operator', 'admin')),
  is_typing boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (session_id, user_id)
);

CREATE INDEX chat_typing_indicator_session_idx
  ON public.chat_typing_indicator (session_id);

ALTER TABLE public.chat_typing_indicator ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_typing_indicator REPLICA IDENTITY FULL;

CREATE POLICY chat_typing_select
  ON public.chat_typing_indicator
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.live_chat_sessions s
      WHERE s.id = chat_typing_indicator.session_id
        AND (
          public.is_org_member(s.organization_id)
          OR EXISTS (
            SELECT 1 FROM public.drivers d
            WHERE d.id = s.driver_id
              AND d.auth_user_id = auth.uid()
              AND d.deleted_at IS NULL
          )
        )
    )
  );

CREATE POLICY chat_typing_insert
  ON public.chat_typing_indicator
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.drivers d
      WHERE d.id = user_id
        AND d.auth_user_id = auth.uid()
        AND d.deleted_at IS NULL
    )
  );

CREATE POLICY chat_typing_update
  ON public.chat_typing_indicator
  FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.drivers d
      WHERE d.id = user_id
        AND d.auth_user_id = auth.uid()
        AND d.deleted_at IS NULL
    )
  )
  WITH CHECK (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.drivers d
      WHERE d.id = user_id
        AND d.auth_user_id = auth.uid()
        AND d.deleted_at IS NULL
    )
  );

CREATE POLICY chat_typing_delete
  ON public.chat_typing_indicator
  FOR DELETE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.drivers d
      WHERE d.id = user_id
        AND d.auth_user_id = auth.uid()
        AND d.deleted_at IS NULL
    )
  );

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'chat_typing_indicator'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_typing_indicator;
  END IF;
END $$;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_typing_indicator TO authenticated;
GRANT ALL ON public.chat_typing_indicator TO service_role;
