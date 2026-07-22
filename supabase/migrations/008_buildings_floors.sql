-- =============================================================================
-- BuildView Phase 2: Buildings & Floors spatial model
-- =============================================================================

CREATE TABLE public.buildings (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id  UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at  TIMESTAMPTZ,
  CONSTRAINT buildings_project_name_unique UNIQUE (project_id, name)
);

CREATE TABLE public.floors (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  building_id UUID NOT NULL REFERENCES public.buildings(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at  TIMESTAMPTZ,
  CONSTRAINT floors_building_name_unique UNIQUE (building_id, name)
);

CREATE INDEX buildings_project_id_idx ON public.buildings(project_id) WHERE deleted_at IS NULL;
CREATE INDEX floors_building_id_idx ON public.floors(building_id) WHERE deleted_at IS NULL;

COMMENT ON TABLE public.buildings IS 'Physical buildings within a construction project.';
COMMENT ON TABLE public.floors IS 'Floors within a building for workspace scoping.';

-- RLS
ALTER TABLE public.buildings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.floors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buildings FORCE ROW LEVEL SECURITY;
ALTER TABLE public.floors FORCE ROW LEVEL SECURITY;

CREATE POLICY "buildings_staff_all"
  ON public.buildings FOR ALL
  TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

CREATE POLICY "buildings_client_read"
  ON public.buildings FOR SELECT
  TO authenticated
  USING (public.has_project_access(project_id));

CREATE POLICY "floors_staff_all"
  ON public.floors FOR ALL
  TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

CREATE POLICY "floors_client_read"
  ON public.floors FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.buildings b
      WHERE b.id = floors.building_id
        AND b.deleted_at IS NULL
        AND public.has_project_access(b.project_id)
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.buildings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.floors TO authenticated;
