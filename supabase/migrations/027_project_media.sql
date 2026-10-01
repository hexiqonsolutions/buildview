-- =============================================================================
-- 027 — Project media (portfolio showcase Videos & Photos)
--
-- Videos (MP4/WebM/MOV/GIF) and photos uploaded by BuildView staff per project,
-- shown below the virtual tour on portfolio showcase portals.
-- Storage path: project-media/{project_id}/{timestamp}-{filename}
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.project_media (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id   UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  media_type   TEXT NOT NULL CHECK (media_type IN ('video', 'photo')),
  title        TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  file_name    TEXT NOT NULL,
  mime_type    TEXT,
  file_size    BIGINT,
  sort_order   INTEGER NOT NULL DEFAULT 0,
  created_by   UUID REFERENCES public.users(id) ON DELETE SET NULL,
  updated_by   UUID REFERENCES public.users(id) ON DELETE SET NULL,
  deleted_by   UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at   TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_project_media_active
  ON public.project_media(project_id, media_type, sort_order)
  WHERE deleted_at IS NULL;

DROP TRIGGER IF EXISTS trg_project_media_updated_at ON public.project_media;
CREATE TRIGGER trg_project_media_updated_at
  BEFORE UPDATE ON public.project_media
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_project_media_soft_delete ON public.project_media;
CREATE TRIGGER trg_project_media_soft_delete
  BEFORE UPDATE ON public.project_media
  FOR EACH ROW EXECUTE FUNCTION public.set_soft_delete_audit();

ALTER TABLE public.project_media ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "project_media_staff_all" ON public.project_media;
CREATE POLICY "project_media_staff_all"
  ON public.project_media
  FOR ALL
  TO authenticated
  USING (public.is_buildview_staff())
  WITH CHECK (public.is_buildview_staff());

DROP POLICY IF EXISTS "project_media_client_select" ON public.project_media;
CREATE POLICY "project_media_client_select"
  ON public.project_media
  FOR SELECT
  TO authenticated
  USING (
    public.has_project_access(project_id)
    AND deleted_at IS NULL
  );

-- -----------------------------------------------------------------------------
-- Storage bucket (private; the portal reads through signed URLs)
-- -----------------------------------------------------------------------------

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'project-media',
  'project-media',
  FALSE,
  209715200,
  ARRAY[
    'video/mp4', 'video/webm', 'video/quicktime',
    'image/gif', 'image/jpeg', 'image/png', 'image/webp'
  ]::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public             = EXCLUDED.public,
  file_size_limit    = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "storage_project_media_staff_all" ON storage.objects;
CREATE POLICY "storage_project_media_staff_all"
  ON storage.objects
  FOR ALL
  TO authenticated
  USING (
    bucket_id = 'project-media'
    AND public.is_buildview_staff()
  )
  WITH CHECK (
    bucket_id = 'project-media'
    AND public.is_buildview_staff()
  );

DROP POLICY IF EXISTS "storage_project_media_client_select" ON storage.objects;
CREATE POLICY "storage_project_media_client_select"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'project-media'
    AND public.has_project_access(public.storage_project_id(name))
  );
