-- Align Progression Report SELECT with can_edit_progression (product: view === edit roles).
-- Previously any assigned project member could SELECT checklist/steps/logs via Supabase REST.

DROP POLICY IF EXISTS "project_progressions_select" ON public.project_progressions;
CREATE POLICY "project_progressions_select"
  ON public.project_progressions
  FOR SELECT
  TO authenticated
  USING (
    deleted_at IS NULL
    AND (
      public.is_buildview_staff()
      OR public.can_edit_progression(project_id)
    )
  );

DROP POLICY IF EXISTS "project_progression_steps_select" ON public.project_progression_steps;
CREATE POLICY "project_progression_steps_select"
  ON public.project_progression_steps
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.project_progressions pp
      WHERE pp.id = progression_id
        AND pp.deleted_at IS NULL
        AND (
          public.is_buildview_staff()
          OR public.can_edit_progression(pp.project_id)
        )
    )
  );

DROP POLICY IF EXISTS "project_progression_logs_select" ON public.project_progression_logs;
CREATE POLICY "project_progression_logs_select"
  ON public.project_progression_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.project_progressions pp
      WHERE pp.id = progression_id
        AND pp.deleted_at IS NULL
        AND (
          public.is_buildview_staff()
          OR public.can_edit_progression(pp.project_id)
        )
    )
  );
