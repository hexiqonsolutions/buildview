-- =============================================================================
-- BuildView Phase 19: Saved comparisons (server persistence)
-- =============================================================================

CREATE TABLE public.saved_comparisons (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  project_id   UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  tour_a_id    UUID NOT NULL REFERENCES public.project_tours(id) ON DELETE CASCADE,
  tour_b_id    UUID NOT NULL REFERENCES public.project_tours(id) ON DELETE CASCADE,
  building     TEXT NOT NULL DEFAULT 'all',
  floor        TEXT NOT NULL DEFAULT 'all',
  building_id  UUID REFERENCES public.buildings(id) ON DELETE SET NULL,
  floor_id     UUID REFERENCES public.floors(id) ON DELETE SET NULL,
  client_id    UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at   TIMESTAMPTZ,
  CONSTRAINT saved_comparisons_distinct_tours CHECK (tour_a_id <> tour_b_id)
);

CREATE INDEX saved_comparisons_user_idx
  ON public.saved_comparisons (user_id)
  WHERE deleted_at IS NULL;

CREATE INDEX saved_comparisons_project_idx
  ON public.saved_comparisons (project_id)
  WHERE deleted_at IS NULL;

ALTER TABLE public.saved_comparisons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_comparisons FORCE ROW LEVEL SECURITY;

CREATE POLICY "saved_comparisons_staff_all"
  ON public.saved_comparisons
  FOR ALL
  TO authenticated
  USING (public.is_buildview_staff())
  WITH CHECK (public.is_buildview_staff());

CREATE POLICY "saved_comparisons_user_own"
  ON public.saved_comparisons
  FOR ALL
  TO authenticated
  USING (
    user_id = auth.uid()
    AND deleted_at IS NULL
    AND public.has_project_access(project_id)
  )
  WITH CHECK (
    user_id = auth.uid()
    AND public.has_project_access(project_id)
  );

COMMENT ON TABLE public.saved_comparisons IS
  'User-saved Matterport scan comparison presets (project, tours, spatial scope).';
