-- ============================================================================
-- BuildView — migration 043: floor names unique only among active floors
-- ============================================================================
-- Soft-deleted floors were still blocking re-create of the same name on a
-- building (e.g. add floors → delete → add again fails silently / with error).
-- Apply in Supabase → SQL Editor. Safe to re-run.
-- ============================================================================

ALTER TABLE public.floors
  DROP CONSTRAINT IF EXISTS floors_building_name_unique;

DROP INDEX IF EXISTS floors_building_name_active_unique;

CREATE UNIQUE INDEX floors_building_name_active_unique
  ON public.floors (building_id, name)
  WHERE deleted_at IS NULL;

COMMENT ON INDEX public.floors_building_name_active_unique IS
  'Floor names must be unique per building among non-deleted floors only.';
