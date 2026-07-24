-- =============================================================================
-- FIX: Project cover thumbnail uploads (run in Supabase SQL Editor)
-- =============================================================================
-- Enables admin thumbnail upload when creating/editing projects.
-- Path: project-covers/{project_id}/{timestamp}-{filename}
-- =============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'project-covers',
  'project-covers',
  TRUE,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public             = EXCLUDED.public,
  file_size_limit    = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "storage_project_covers_public_select" ON storage.objects;
CREATE POLICY "storage_project_covers_public_select"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'project-covers');

DROP POLICY IF EXISTS "storage_project_covers_staff_all" ON storage.objects;
CREATE POLICY "storage_project_covers_staff_all"
  ON storage.objects
  FOR ALL
  TO authenticated
  USING (
    bucket_id = 'project-covers'
    AND public.is_buildview_staff()
  )
  WITH CHECK (
    bucket_id = 'project-covers'
    AND public.is_buildview_staff()
  );
