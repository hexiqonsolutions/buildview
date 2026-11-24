-- =============================================================================
-- 048 — Definable Completion: activities, stages, zones, observations (M4a)
--
-- Activities (trades) with weights and stages with credits; BuildView defaults
-- have project_id NULL and a project may override them later (template editor).
-- Zones = flats / units / rooms / common areas on a floor, with an area.
-- Observations = append-only "this activity reached this stage in this zone
-- on this date", with evidence scan, source (manual|ai) and verification.
-- A floor that has zones takes its % from them; other floors keep the checklist.
--
-- Apply in Supabase → SQL Editor. Safe to re-run.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.completion_activities (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  key         TEXT NOT NULL,
  name        TEXT NOT NULL,
  weight      NUMERIC(6, 2) NOT NULL CHECK (weight >= 0),
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS completion_activities_default_key
  ON public.completion_activities (key) WHERE project_id IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS completion_activities_project_key
  ON public.completion_activities (project_id, key) WHERE project_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.completion_stages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  key         TEXT NOT NULL,
  name        TEXT NOT NULL,
  credit      NUMERIC(5, 2) NOT NULL CHECK (credit >= 0 AND credit <= 100),
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS completion_stages_default_key
  ON public.completion_stages (key) WHERE project_id IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS completion_stages_project_key
  ON public.completion_stages (project_id, key) WHERE project_id IS NOT NULL;

-- BuildView defaults (spec reference weights; cumulative stage credits).
INSERT INTO public.completion_activities (project_id, key, name, weight, sort_order)
SELECT NULL, v.key, v.name, v.weight, v.sort_order
FROM (VALUES
  ('blockwork', 'Blockwork', 20, 1),
  ('services',  'Services (MEP)', 15, 2),
  ('plaster',   'Plaster', 20, 3),
  ('flooring',  'Flooring', 20, 4),
  ('paint',     'Paint', 25, 5)
) AS v(key, name, weight, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM public.completion_activities a WHERE a.project_id IS NULL AND a.key = v.key
);

INSERT INTO public.completion_stages (project_id, key, name, credit, sort_order)
SELECT NULL, v.key, v.name, v.credit, v.sort_order
FROM (VALUES
  ('not_started', 'Not started', 0, 1),
  ('started',     'Started', 25, 2),
  ('half',        'Half done', 50, 3),
  ('done',        'Done', 100, 4)
) AS v(key, name, credit, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM public.completion_stages s WHERE s.project_id IS NULL AND s.key = v.key
);

CREATE TABLE IF NOT EXISTS public.progress_zones (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id     UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  floor_id       UUID NOT NULL REFERENCES public.floors(id) ON DELETE CASCADE,
  name           TEXT NOT NULL,
  zone_type      TEXT NOT NULL DEFAULT 'flat'
                   CHECK (zone_type IN ('flat', 'unit', 'room', 'common', 'other')),
  area_sqft      NUMERIC(10, 2) CHECK (area_sqft IS NULL OR area_sqft > 0),
  custom_weight  NUMERIC(10, 2) CHECK (custom_weight IS NULL OR custom_weight >= 0),
  /** Normalised [[x,y], …] (0–1) outline on the floor-plan image (M4b). */
  polygon        JSONB,
  sort_order     INTEGER NOT NULL DEFAULT 0,
  created_by     UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at     TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS progress_zones_floor_idx
  ON public.progress_zones (project_id, floor_id, sort_order) WHERE deleted_at IS NULL;

DROP TRIGGER IF EXISTS trg_progress_zones_updated_at ON public.progress_zones;
CREATE TRIGGER trg_progress_zones_updated_at
  BEFORE UPDATE ON public.progress_zones
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Activities that don't apply to a zone (e.g. no waterproofing in a bedroom).
CREATE TABLE IF NOT EXISTS public.progress_zone_na (
  zone_id       UUID NOT NULL REFERENCES public.progress_zones(id) ON DELETE CASCADE,
  activity_key  TEXT NOT NULL,
  PRIMARY KEY (zone_id, activity_key)
);

CREATE TABLE IF NOT EXISTS public.progress_observations (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id           UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  zone_id              UUID NOT NULL REFERENCES public.progress_zones(id) ON DELETE CASCADE,
  activity_key         TEXT NOT NULL,
  stage_key            TEXT NOT NULL,
  observed_on          DATE NOT NULL,
  evidence_tour_id     UUID REFERENCES public.project_tours(id) ON DELETE SET NULL,
  note                 TEXT,
  source               TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'ai')),
  entered_by           UUID REFERENCES public.users(id) ON DELETE SET NULL,
  verification_status  TEXT CHECK (verification_status IS NULL OR verification_status IN ('verified', 'rejected')),
  verified_by          UUID REFERENCES public.users(id) ON DELETE SET NULL,
  verified_at          TIMESTAMPTZ,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS progress_observations_zone_idx
  ON public.progress_observations (zone_id, activity_key, observed_on DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS progress_observations_project_idx
  ON public.progress_observations (project_id, observed_on DESC);

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS completion_rollup_basis TEXT NOT NULL DEFAULT 'area';
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'projects_completion_rollup_basis_check'
      AND conrelid = 'public.projects'::regclass
  ) THEN
    ALTER TABLE public.projects
      ADD CONSTRAINT projects_completion_rollup_basis_check
      CHECK (completion_rollup_basis IN ('area', 'equal', 'custom'));
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- RLS: everyone with project access reads; staff define activities/stages/zones;
-- progression editors add observations; verifiers verify (B5).
-- -----------------------------------------------------------------------------

ALTER TABLE public.completion_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.completion_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.progress_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.progress_zone_na ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.progress_observations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "completion_activities_read" ON public.completion_activities;
CREATE POLICY "completion_activities_read" ON public.completion_activities
  FOR SELECT TO authenticated
  USING (project_id IS NULL OR public.is_buildview_staff() OR public.has_project_access(project_id));
DROP POLICY IF EXISTS "completion_activities_staff" ON public.completion_activities;
CREATE POLICY "completion_activities_staff" ON public.completion_activities
  FOR ALL TO authenticated
  USING (public.is_buildview_staff()) WITH CHECK (public.is_buildview_staff());

DROP POLICY IF EXISTS "completion_stages_read" ON public.completion_stages;
CREATE POLICY "completion_stages_read" ON public.completion_stages
  FOR SELECT TO authenticated
  USING (project_id IS NULL OR public.is_buildview_staff() OR public.has_project_access(project_id));
DROP POLICY IF EXISTS "completion_stages_staff" ON public.completion_stages;
CREATE POLICY "completion_stages_staff" ON public.completion_stages
  FOR ALL TO authenticated
  USING (public.is_buildview_staff()) WITH CHECK (public.is_buildview_staff());

DROP POLICY IF EXISTS "progress_zones_read" ON public.progress_zones;
CREATE POLICY "progress_zones_read" ON public.progress_zones
  FOR SELECT TO authenticated
  USING (deleted_at IS NULL AND (public.is_buildview_staff() OR public.has_project_access(project_id)));
DROP POLICY IF EXISTS "progress_zones_staff" ON public.progress_zones;
CREATE POLICY "progress_zones_staff" ON public.progress_zones
  FOR ALL TO authenticated
  USING (public.is_buildview_staff()) WITH CHECK (public.is_buildview_staff());

DROP POLICY IF EXISTS "progress_zone_na_read" ON public.progress_zone_na;
CREATE POLICY "progress_zone_na_read" ON public.progress_zone_na
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.progress_zones z
    WHERE z.id = zone_id AND (public.is_buildview_staff() OR public.has_project_access(z.project_id))
  ));
DROP POLICY IF EXISTS "progress_zone_na_staff" ON public.progress_zone_na;
CREATE POLICY "progress_zone_na_staff" ON public.progress_zone_na
  FOR ALL TO authenticated
  USING (public.is_buildview_staff()) WITH CHECK (public.is_buildview_staff());

DROP POLICY IF EXISTS "progress_observations_read" ON public.progress_observations;
CREATE POLICY "progress_observations_read" ON public.progress_observations
  FOR SELECT TO authenticated
  USING (public.is_buildview_staff() OR public.has_project_access(project_id));
DROP POLICY IF EXISTS "progress_observations_insert" ON public.progress_observations;
CREATE POLICY "progress_observations_insert" ON public.progress_observations
  FOR INSERT TO authenticated
  WITH CHECK (public.can_edit_progression(project_id) AND entered_by = auth.uid());
DROP POLICY IF EXISTS "progress_observations_verify" ON public.progress_observations;
CREATE POLICY "progress_observations_verify" ON public.progress_observations
  FOR UPDATE TO authenticated
  USING (public.can_verify_progression(project_id))
  WITH CHECK (public.can_verify_progression(project_id));

COMMENT ON TABLE public.progress_observations IS
  'Append-only: activity reached stage in zone on date (with evidence, source, verification).';

NOTIFY pgrst, 'reload schema';
