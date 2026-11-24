-- =============================================================================
-- 049 — Floor-plan image per floor (Definable Completion, Milestone 4b)
--
-- The image lives in the private project-media bucket under {project_id}/…,
-- so the existing storage RLS from migration 027 applies. Zone outlines are
-- stored on progress_zones.polygon (migration 048) as normalised [x, y] points.
--
-- Apply in Supabase → SQL Editor. Safe to re-run.
-- =============================================================================

ALTER TABLE public.floors
  ADD COLUMN IF NOT EXISTS plan_image_path TEXT;

COMMENT ON COLUMN public.floors.plan_image_path IS
  'Floor-plan image in project-media ({project_id}/…) used for the zone heatmap.';

NOTIFY pgrst, 'reload schema';
