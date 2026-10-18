-- =============================================================================
-- Progression Report: one checklist per floor (multi-building)
-- Decisions: reset existing ticks; every floor gets post_slab_v1; aggregate
-- project % from activated floors only (at least one completed step).
-- =============================================================================

-- 4C: start fresh — drop project-level ticks before reshaping the table
DELETE FROM public.project_progression_logs;
DELETE FROM public.project_progression_steps;
DELETE FROM public.project_progressions;

ALTER TABLE public.project_progressions
  DROP CONSTRAINT IF EXISTS project_progressions_project_id_key;

ALTER TABLE public.project_progressions
  ADD COLUMN IF NOT EXISTS floor_id UUID REFERENCES public.floors(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS building_id UUID REFERENCES public.buildings(id) ON DELETE CASCADE;

-- Seed a progression row (+ steps) for every existing floor
DO $$
DECLARE
  tpl_id UUID;
  floor_rec RECORD;
  prog_id UUID;
BEGIN
  SELECT id INTO tpl_id
  FROM public.progression_templates
  WHERE key = 'post_slab_v1' AND is_active = TRUE
  LIMIT 1;

  IF tpl_id IS NULL THEN
    RAISE NOTICE '034: post_slab_v1 template missing — skip floor seed';
    RETURN;
  END IF;

  FOR floor_rec IN
    SELECT f.id AS floor_id, f.building_id, b.project_id
    FROM public.floors f
    JOIN public.buildings b ON b.id = f.building_id
    WHERE f.deleted_at IS NULL
      AND b.deleted_at IS NULL
  LOOP
    INSERT INTO public.project_progressions (project_id, floor_id, building_id, template_id)
    VALUES (floor_rec.project_id, floor_rec.floor_id, floor_rec.building_id, tpl_id)
    RETURNING id INTO prog_id;

    INSERT INTO public.project_progression_steps
      (progression_id, template_step_id, step_number, status)
    SELECT prog_id, s.id, s.step_number, 'pending'
    FROM public.progression_template_steps s
    WHERE s.template_id = tpl_id
    ORDER BY s.step_number;
  END LOOP;
END $$;

-- Require floor for all remaining / future rows
ALTER TABLE public.project_progressions
  ALTER COLUMN floor_id SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS project_progressions_floor_unique
  ON public.project_progressions (floor_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS project_progressions_project_floor_idx
  ON public.project_progressions (project_id, floor_id)
  WHERE deleted_at IS NULL;

COMMENT ON COLUMN public.project_progressions.floor_id IS
  'Each monitored floor has its own 56-step Progression Report instance.';
COMMENT ON COLUMN public.project_progressions.building_id IS
  'Denormalized building for the floor (multi-tower projects).';
