-- Industry chat: denormalized sender name on each message + public chat-images bucket

ALTER TABLE public.live_chat_messages
  ADD COLUMN IF NOT EXISTS sender_display_name text;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'chat-images',
  'chat-images',
  true,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE
SET public = true,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS chat_images_public_read ON storage.objects;
CREATE POLICY chat_images_public_read
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'chat-images');

DROP POLICY IF EXISTS chat_images_auth_insert ON storage.objects;
CREATE POLICY chat_images_auth_insert
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'chat-images');

DROP POLICY IF EXISTS chat_images_auth_update ON storage.objects;
CREATE POLICY chat_images_auth_update
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'chat-images');

DROP POLICY IF EXISTS chat_images_auth_delete ON storage.objects;
CREATE POLICY chat_images_auth_delete
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'chat-images');
