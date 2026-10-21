-- =============================================================================
-- Progression Report: planned Start / Deadline per floor + track
-- Editors set a target start date and a deadline (end date) for each
-- Pre-Slab / Post-Slab checklist on a floor; the UI flags overdue tracks.
-- =============================================================================

ALTER TABLE public.project_progressions
  ADD COLUMN IF NOT EXISTS planned_start_date DATE,
  ADD COLUMN IF NOT EXISTS planned_end_date DATE;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'project_progressions_planned_dates_check'
      AND conrelid = 'public.project_progressions'::regclass
  ) THEN
    ALTER TABLE public.project_progressions
      ADD CONSTRAINT project_progressions_planned_dates_check
      CHECK (
        planned_end_date IS NULL
        OR planned_start_date IS NULL
        OR planned_end_date >= planned_start_date
      );
  END IF;
END $$;

COMMENT ON COLUMN public.project_progressions.planned_start_date IS
  'Planned start date for this floor + track checklist (schedule).';
COMMENT ON COLUMN public.project_progressions.planned_end_date IS
  'Deadline (target end date) for this floor + track checklist.';
