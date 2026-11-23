-- =============================================================================
-- 046 — Archive virtual tours
--
-- archived_at hides a tour from client portals and public share links while
-- keeping it in the admin Tour Manager (restorable). Deleting a tour stays a
-- soft delete via deleted_at.
--
-- Apply in Supabase → SQL Editor. Safe to re-run.
-- =============================================================================

ALTER TABLE public.project_tours
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

COMMENT ON COLUMN public.project_tours.archived_at IS
  'When set, the tour is hidden from client portals and share links but kept for staff.';

-- Clients: only live (not deleted, not archived) tours.
DROP POLICY IF EXISTS "tours_client_select" ON public.project_tours;
CREATE POLICY "tours_client_select"
  ON public.project_tours
  FOR SELECT
  TO authenticated
  USING (
    public.has_project_access(project_id)
    AND deleted_at IS NULL
    AND archived_at IS NULL
  );

-- Staff: every non-deleted tour, including archived ones.
DROP POLICY IF EXISTS "tours_staff_select" ON public.project_tours;
CREATE POLICY "tours_staff_select"
  ON public.project_tours
  FOR SELECT
  TO authenticated
  USING (
    public.is_buildview_staff()
    AND deleted_at IS NULL
  );

NOTIFY pgrst, 'reload schema';
