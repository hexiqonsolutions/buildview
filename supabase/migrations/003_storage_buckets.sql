-- =============================================================================
-- BuildView — Phase 3: Supabase Storage Buckets & Policies
-- =============================================================================
-- Run after: 001_initial_schema.sql, 002_rls_policies.sql
--
-- Path conventions (first folder segment = project_id UUID):
--   reports/{project_id}/{filename}
--   documents/{project_id}/{folder_id}/{filename}
--   issue-images/{project_id}/{issue_id}/{filename}
--   timeline-photos/{project_id}/{event_id}/{filename}
--   avatars/{user_id}/{filename}
-- =============================================================================

-- =============================================================================
-- Storage helper — extract project_id from object path
-- =============================================================================

CREATE OR REPLACE FUNCTION public.storage_project_id(object_path TEXT)
RETURNS UUID
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public, storage
AS $$
DECLARE
  first_segment TEXT;
BEGIN
  first_segment := (storage.foldername(object_path))[1];
  IF first_segment IS NULL OR first_segment = '' THEN
    RETURN NULL;
  END IF;
  RETURN first_segment::uuid;
EXCEPTION
  WHEN invalid_text_representation THEN
    RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.storage_user_id(object_path TEXT)
RETURNS UUID
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public, storage
AS $$
DECLARE
  first_segment TEXT;
BEGIN
  first_segment := (storage.foldername(object_path))[1];
  IF first_segment IS NULL OR first_segment = '' THEN
    RETURN NULL;
  END IF;
  RETURN first_segment::uuid;
EXCEPTION
  WHEN invalid_text_representation THEN
    RETURN NULL;
END;
$$;

GRANT EXECUTE ON FUNCTION public.storage_project_id(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.storage_user_id(TEXT) TO authenticated;

-- =============================================================================
-- Create buckets
-- =============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  (
    'reports',
    'reports',
    FALSE,
    52428800, -- 50 MB
    ARRAY['application/pdf']::text[]
  ),
  (
    'documents',
    'documents',
    FALSE,
    104857600, -- 100 MB
    ARRAY[
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif',
      'application/zip',
      'application/x-zip-compressed',
      'text/plain',
      'application/octet-stream'
    ]::text[]
  ),
  (
    'issue-images',
    'issue-images',
    FALSE,
    10485760, -- 10 MB
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic']::text[]
  ),
  (
    'timeline-photos',
    'timeline-photos',
    FALSE,
    10485760, -- 10 MB
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic']::text[]
  ),
  (
    'avatars',
    'avatars',
    TRUE,
    5242880, -- 5 MB
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']::text[]
  )
ON CONFLICT (id) DO UPDATE SET
  public               = EXCLUDED.public,
  file_size_limit      = EXCLUDED.file_size_limit,
  allowed_mime_types   = EXCLUDED.allowed_mime_types;

-- =============================================================================
-- REPORTS bucket — admin upload, assigned clients read
-- =============================================================================

CREATE POLICY "storage_reports_super_admin_all"
  ON storage.objects
  FOR ALL
  TO authenticated
  USING (
    bucket_id = 'reports'
    AND public.is_super_admin()
  )
  WITH CHECK (
    bucket_id = 'reports'
    AND public.is_super_admin()
  );

CREATE POLICY "storage_reports_client_select"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'reports'
    AND public.has_project_access(public.storage_project_id(name))
  );

-- =============================================================================
-- DOCUMENTS bucket — admin upload, assigned clients read
-- =============================================================================

CREATE POLICY "storage_documents_super_admin_all"
  ON storage.objects
  FOR ALL
  TO authenticated
  USING (
    bucket_id = 'documents'
    AND public.is_super_admin()
  )
  WITH CHECK (
    bucket_id = 'documents'
    AND public.is_super_admin()
  );

CREATE POLICY "storage_documents_client_select"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'documents'
    AND public.has_project_access(public.storage_project_id(name))
  );

-- =============================================================================
-- ISSUE-IMAGES bucket — admin full access, clients read + upload on assigned projects
-- =============================================================================

CREATE POLICY "storage_issue_images_super_admin_all"
  ON storage.objects
  FOR ALL
  TO authenticated
  USING (
    bucket_id = 'issue-images'
    AND public.is_super_admin()
  )
  WITH CHECK (
    bucket_id = 'issue-images'
    AND public.is_super_admin()
  );

CREATE POLICY "storage_issue_images_client_select"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'issue-images'
    AND public.has_project_access(public.storage_project_id(name))
  );

CREATE POLICY "storage_issue_images_client_insert"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'issue-images'
    AND public.has_project_access(public.storage_project_id(name))
    AND public.is_active_authenticated_user()
  );

CREATE POLICY "storage_issue_images_client_delete_own"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'issue-images'
    AND public.has_project_access(public.storage_project_id(name))
    AND owner = auth.uid()
  );

-- =============================================================================
-- TIMELINE-PHOTOS bucket — admin upload, assigned clients read
-- =============================================================================

CREATE POLICY "storage_timeline_photos_super_admin_all"
  ON storage.objects
  FOR ALL
  TO authenticated
  USING (
    bucket_id = 'timeline-photos'
    AND public.is_super_admin()
  )
  WITH CHECK (
    bucket_id = 'timeline-photos'
    AND public.is_super_admin()
  );

CREATE POLICY "storage_timeline_photos_client_select"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'timeline-photos'
    AND public.has_project_access(public.storage_project_id(name))
  );

-- =============================================================================
-- AVATARS bucket — public read, users manage own folder
-- =============================================================================

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
