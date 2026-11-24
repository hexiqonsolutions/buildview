-- =============================================================================
-- 052 — Definable templates: N/A rules and per-trade plans (Milestone 6)
--
-- completion_na_rules: trades that are N/A by default for a zone type
--   (project_id NULL = BuildView default; a project may override). Applied when
--   a zone is created.
-- completion_activity_plans: planned start / end of a trade on a floor. A zoned
--   floor's planned % = weighted planned % of its trades.
--
-- Apply in Supabase → SQL Editor. Safe to re-run.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.completion_na_rules (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id    UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  zone_type     TEXT NOT NULL CHECK (zone_type IN ('flat', 'unit', 'room', 'common', 'other')),
  activity_key  TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS completion_na_rules_default_unique
  ON public.completion_na_rules (zone_type, activity_key) WHERE project_id IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS completion_na_rules_project_unique
  ON public.completion_na_rules (project_id, zone_type, activity_key) WHERE project_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.completion_activity_plans (
  project_id     UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  floor_id       UUID NOT NULL REFERENCES public.floors(id) ON DELETE CASCADE,
  activity_key   TEXT NOT NULL,
  planned_start  DATE NOT NULL,
  planned_end    DATE NOT NULL,
  updated_by     UUID REFERENCES public.users(id) ON DELETE SET NULL,
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (floor_id, activity_key),
  CONSTRAINT completion_activity_plans_dates CHECK (planned_end >= planned_start)
);
CREATE INDEX IF NOT EXISTS completion_activity_plans_project_idx
  ON public.completion_activity_plans (project_id);

ALTER TABLE public.completion_na_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.completion_activity_plans ENABLE ROW LEVEL SECURITY;

-- N/A rules are part of the template: read by project members, written by staff.
DROP POLICY IF EXISTS "completion_na_rules_read" ON public.completion_na_rules;
CREATE POLICY "completion_na_rules_read" ON public.completion_na_rules
  FOR SELECT TO authenticated
  USING (project_id IS NULL OR public.is_buildview_staff() OR public.has_project_access(project_id));
DROP POLICY IF EXISTS "completion_na_rules_staff" ON public.completion_na_rules;
CREATE POLICY "completion_na_rules_staff" ON public.completion_na_rules
  FOR ALL TO authenticated
  USING (public.is_buildview_staff()) WITH CHECK (public.is_buildview_staff());

-- Plans: read by project members, written by progression editors.
DROP POLICY IF EXISTS "completion_activity_plans_read" ON public.completion_activity_plans;
CREATE POLICY "completion_activity_plans_read" ON public.completion_activity_plans
  FOR SELECT TO authenticated
  USING (public.is_buildview_staff() OR public.has_project_access(project_id));
DROP POLICY IF EXISTS "completion_activity_plans_editors" ON public.completion_activity_plans;
CREATE POLICY "completion_activity_plans_editors" ON public.completion_activity_plans
  FOR ALL TO authenticated
  USING (public.can_edit_progression(project_id))
  WITH CHECK (public.can_edit_progression(project_id));

NOTIFY pgrst, 'reload schema';
