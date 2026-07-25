-- =============================================================================
-- FIX: Profile photo (avatars) bucket — run in Supabase SQL Editor if upload fails
-- =============================================================================
-- Path: avatars/{user_id}/{timestamp}-{filename}
-- Public read; each user can manage files in their own folder.
-- =============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  TRUE,
  2097152,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "storage_avatars_public_select" ON storage.objects;
DROP POLICY IF EXISTS "storage_avatars_super_admin_all" ON storage.objects;
DROP POLICY IF EXISTS "storage_avatars_user_insert" ON storage.objects;
DROP POLICY IF EXISTS "storage_avatars_user_update" ON storage.objects;
DROP POLICY IF EXISTS "storage_avatars_user_delete" ON storage.objects;

CREATE POLICY "storage_avatars_public_select"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'avatars');

CREATE POLICY "storage_avatars_super_admin_all"
  ON storage.objects
  FOR ALL
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND public.is_super_admin()
  )
  WITH CHECK (
    bucket_id = 'avatars'
    AND public.is_super_admin()
  );

CREATE POLICY "storage_avatars_user_insert"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND public.storage_user_id(name) = auth.uid()
    AND public.is_active_authenticated_user()
  );

CREATE POLICY "storage_avatars_user_update"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND public.storage_user_id(name) = auth.uid()
  )
  WITH CHECK (
    bucket_id = 'avatars'
    AND public.storage_user_id(name) = auth.uid()
  );

CREATE POLICY "storage_avatars_user_delete"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND public.storage_user_id(name) = auth.uid()
  );
