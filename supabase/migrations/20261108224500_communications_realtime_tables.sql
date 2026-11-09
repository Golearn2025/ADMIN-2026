-- Enable Realtime for Communications Help sessions inbox
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'live_chat_sessions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.live_chat_sessions;
  END IF;
END $$;
