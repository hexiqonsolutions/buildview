-- =============================================================================
-- 058 — Photos on checklist steps (Start / Done)
--
-- Files live in the private project-media bucket under
-- {project_id}/progress/{step_id}/… (storage RLS from migration 027 applies);
-- the app reads them through signed links. Written by the service role after
-- the app checks the uploader may edit progression.
-- Apply in Supabase → SQL Editor. Safe to re-run.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.step_photos (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  step_id      UUID NOT NULL REFERENCES public.project_progression_steps(id) ON DELETE CASCADE,
  project_id   UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  kind         TEXT NOT NULL CHECK (kind IN ('start', 'end', 'other')),
  path         TEXT NOT NULL,
  width        INTEGER,
  height       INTEGER,
  uploaded_by  UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS step_photos_step_idx ON public.step_photos (step_id, created_at);
CREATE INDEX IF NOT EXISTS step_photos_project_idx ON public.step_photos (project_id, created_at DESC);

ALTER TABLE public.step_photos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "step_photos_read" ON public.step_photos;
CREATE POLICY "step_photos_read" ON public.step_photos
  FOR SELECT TO authenticated
  USING (public.is_buildview_staff() OR public.has_project_access(project_id));

NOTIFY pgrst, 'reload schema';

-- Check: the table exists (1 row).
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'step_photos';
