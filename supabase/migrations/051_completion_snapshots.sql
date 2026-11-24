-- =============================================================================
-- 051 — Daily completion snapshots (Definable Completion, Milestone 5)
--
-- One row per project per day with the % shown that day (actual, planned,
-- status). Written by the app when the Progression report is opened, so there
-- is an audit trail of reported numbers alongside the rebuilt S-curve.
--
-- Apply in Supabase → SQL Editor. Safe to re-run.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.completion_snapshots (
  project_id     UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  snapshot_date  DATE NOT NULL,
  actual         NUMERIC(6, 2) NOT NULL,
  planned        NUMERIC(6, 2),
  status         TEXT NOT NULL,
  verified_only  BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (project_id, snapshot_date)
);

ALTER TABLE public.completion_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "completion_snapshots_read" ON public.completion_snapshots;
CREATE POLICY "completion_snapshots_read" ON public.completion_snapshots
  FOR SELECT TO authenticated
  USING (public.is_buildview_staff() OR public.has_project_access(project_id));
-- Writes happen server-side with the service role only.

NOTIFY pgrst, 'reload schema';
