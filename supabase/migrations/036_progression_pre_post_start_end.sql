-- =============================================================================
-- Progression Report: Pre-Slab + Post-Slab tracks, Start/End step workflow
-- - One progression per floor per track (pre_slab / post_slab)
-- - Steps: pending -> in_progress (Start) -> completed (End), with timestamps
-- - Existing Post-Slab ticks preserved: completed_at becomes ended_at
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Track column + per-(floor, track) uniqueness
-- ---------------------------------------------------------------------------

ALTER TABLE public.project_progressions
  ADD COLUMN IF NOT EXISTS track TEXT NOT NULL DEFAULT 'post_slab';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'project_progressions_track_check'
      AND conrelid = 'public.project_progressions'::regclass
  ) THEN
    ALTER TABLE public.project_progressions
      ADD CONSTRAINT project_progressions_track_check
      CHECK (track IN ('pre_slab', 'post_slab'));
  END IF;
END $$;

DROP INDEX IF EXISTS public.project_progressions_floor_unique;

CREATE UNIQUE INDEX IF NOT EXISTS project_progressions_floor_track_unique
  ON public.project_progressions (floor_id, track)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS project_progressions_project_track_idx
  ON public.project_progressions (project_id, track, floor_id)
  WHERE deleted_at IS NULL;

-- ---------------------------------------------------------------------------
-- Step Start/End columns + status / log action constraints
-- ---------------------------------------------------------------------------

ALTER TABLE public.project_progression_steps
  ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS started_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS ended_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ended_by UUID REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE public.project_progression_steps
  DROP CONSTRAINT IF EXISTS project_progression_steps_status_check;
ALTER TABLE public.project_progression_steps
  ADD CONSTRAINT project_progression_steps_status_check
  CHECK (status IN ('pending', 'in_progress', 'completed'));

ALTER TABLE public.project_progression_logs
  DROP CONSTRAINT IF EXISTS project_progression_logs_action_check;
ALTER TABLE public.project_progression_logs
  ADD CONSTRAINT project_progression_logs_action_check
  CHECK (action IN ('completed', 'reopened', 'started', 'ended', 'reset', 'date_corrected'));

-- Historical Post-Slab completions: original completion moment is the End moment.
UPDATE public.project_progression_steps
SET ended_at = completed_at,
    ended_by = completed_by
WHERE status = 'completed'
  AND ended_at IS NULL
  AND completed_at IS NOT NULL;

-- ---------------------------------------------------------------------------
-- Seed: pre_slab_v1 (6 phases / 56 steps)
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  template_id UUID;
BEGIN
  INSERT INTO public.progression_templates (key, name, version, is_active)
  VALUES ('pre_slab_v1', 'Construction work sequence before slab casting', 1, TRUE)
  ON CONFLICT (key) DO UPDATE SET is_active = TRUE
  RETURNING id INTO template_id;

  INSERT INTO public.progression_template_steps
    (template_id, step_number, phase_number, phase_name, phase_stage, title)
  VALUES
    (template_id, 1, 1, 'Column, wall and vertical reinforcement', 'Pre-slab structural works', 'Previous slab curing and de-shuttering, as permitted by the engineer'),
    (template_id, 2, 1, 'Column, wall and vertical reinforcement', 'Pre-slab structural works', 'Surveying and marking column locations and grid lines'),
    (template_id, 3, 1, 'Column, wall and vertical reinforcement', 'Pre-slab structural works', 'Column reinforcement cutting, bending and fixing'),
    (template_id, 4, 1, 'Column, wall and vertical reinforcement', 'Pre-slab structural works', 'Column stirrups / ties installation'),
    (template_id, 5, 1, 'Column, wall and vertical reinforcement', 'Pre-slab structural works', 'Column reinforcement inspection and cover-block placement'),
    (template_id, 6, 1, 'Column, wall and vertical reinforcement', 'Pre-slab structural works', 'Column formwork / shuttering installation'),
    (template_id, 7, 1, 'Column, wall and vertical reinforcement', 'Pre-slab structural works', 'Column verticality, dimensions and alignment checks'),
    (template_id, 8, 1, 'Column, wall and vertical reinforcement', 'Pre-slab structural works', 'Column concreting, where columns are cast separately from the slab'),
    (template_id, 9, 2, 'Beam and slab formwork', 'Formwork stage', 'Material shifting and floor preparation'),
    (template_id, 10, 2, 'Beam and slab formwork', 'Formwork stage', 'Prop / staging / scaffolding installation'),
    (template_id, 11, 2, 'Beam and slab formwork', 'Formwork stage', 'Beam bottom shuttering installation'),
    (template_id, 12, 2, 'Beam and slab formwork', 'Formwork stage', 'Beam side shuttering installation'),
    (template_id, 13, 2, 'Beam and slab formwork', 'Formwork stage', 'Slab centering and deck shuttering installation'),
    (template_id, 14, 2, 'Beam and slab formwork', 'Formwork stage', 'Checking formwork levels, line, level and alignment'),
    (template_id, 15, 2, 'Beam and slab formwork', 'Formwork stage', 'Checking supports, bracing and formwork stability'),
    (template_id, 16, 2, 'Beam and slab formwork', 'Formwork stage', 'Applying approved shuttering release agent'),
    (template_id, 17, 2, 'Beam and slab formwork', 'Formwork stage', 'Providing slab openings, shafts and service cut-outs as per drawings'),
    (template_id, 18, 3, 'Beam and slab reinforcement', 'Reinforcement stage', 'Beam reinforcement cutting and bending'),
    (template_id, 19, 3, 'Beam and slab reinforcement', 'Reinforcement stage', 'Beam bottom reinforcement fixing'),
    (template_id, 20, 3, 'Beam and slab reinforcement', 'Reinforcement stage', 'Beam top reinforcement and extra bars fixing'),
    (template_id, 21, 3, 'Beam and slab reinforcement', 'Reinforcement stage', 'Beam stirrups / links installation'),
    (template_id, 22, 3, 'Beam and slab reinforcement', 'Reinforcement stage', 'Slab bottom reinforcement fixing'),
    (template_id, 23, 3, 'Beam and slab reinforcement', 'Reinforcement stage', 'Slab top reinforcement and negative bars fixing'),
    (template_id, 24, 3, 'Beam and slab reinforcement', 'Reinforcement stage', 'Distribution reinforcement and additional bars installation'),
    (template_id, 25, 3, 'Beam and slab reinforcement', 'Reinforcement stage', 'Chair bars / spacers installation'),
    (template_id, 26, 3, 'Beam and slab reinforcement', 'Reinforcement stage', 'Cover blocks placement and reinforcement cover checks'),
    (template_id, 27, 3, 'Beam and slab reinforcement', 'Reinforcement stage', 'Lapping, anchorage and development-length checks'),
    (template_id, 28, 3, 'Beam and slab reinforcement', 'Reinforcement stage', 'Reinforcement inspection against structural drawings'),
    (template_id, 29, 4, 'Electrical and plumbing provisions', 'Pre-pour MEP provisions', 'Electrical conduits embedded in slab, as per drawings'),
    (template_id, 30, 4, 'Electrical and plumbing provisions', 'Pre-pour MEP provisions', 'Electrical junction boxes and outlet provisions'),
    (template_id, 31, 4, 'Electrical and plumbing provisions', 'Pre-pour MEP provisions', 'Sleeves for plumbing and drainage pipes'),
    (template_id, 32, 4, 'Electrical and plumbing provisions', 'Pre-pour MEP provisions', 'Openings for vertical service risers and MEP shafts'),
    (template_id, 33, 4, 'Electrical and plumbing provisions', 'Pre-pour MEP provisions', 'AC, fire-fighting and other service provisions, where applicable'),
    (template_id, 34, 4, 'Electrical and plumbing provisions', 'Pre-pour MEP provisions', 'Checking conduits and sleeves for clashes with reinforcement'),
    (template_id, 35, 4, 'Electrical and plumbing provisions', 'Pre-pour MEP provisions', 'Verifying all service openings against coordinated MEP drawings'),
    (template_id, 36, 4, 'Electrical and plumbing provisions', 'Pre-pour MEP provisions', 'MEP inspection and approval before concreting'),
    (template_id, 37, 5, 'Edge protection and slab preparation', 'Slab preparation stage', 'Balcony and slab-edge shuttering installation'),
    (template_id, 38, 5, 'Edge protection and slab preparation', 'Slab preparation stage', 'Edge protection and safe access arrangements'),
    (template_id, 39, 5, 'Edge protection and slab preparation', 'Slab preparation stage', 'Parapet / upstand / sunken-area provisions, where applicable'),
    (template_id, 40, 5, 'Edge protection and slab preparation', 'Slab preparation stage', 'Checking slab thickness and beam dimensions'),
    (template_id, 41, 5, 'Edge protection and slab preparation', 'Slab preparation stage', 'Checking slab levels, slopes and drop panels, where specified'),
    (template_id, 42, 5, 'Edge protection and slab preparation', 'Slab preparation stage', 'Removing loose binding wire, debris and standing water'),
    (template_id, 43, 5, 'Edge protection and slab preparation', 'Slab preparation stage', 'Checking reinforcement cleanliness and stability'),
    (template_id, 44, 5, 'Edge protection and slab preparation', 'Slab preparation stage', 'Final formwork and staging inspection'),
    (template_id, 45, 6, 'Pre-pour inspection and slab casting', 'Slab casting stage', 'Structural engineer''s reinforcement inspection'),
    (template_id, 46, 6, 'Pre-pour inspection and slab casting', 'Slab casting stage', 'MEP coordination and inspection sign-off'),
    (template_id, 47, 6, 'Pre-pour inspection and slab casting', 'Slab casting stage', 'Formwork, staging and access safety clearance'),
    (template_id, 48, 6, 'Pre-pour inspection and slab casting', 'Slab casting stage', 'Concrete grade and approved mix confirmation'),
    (template_id, 49, 6, 'Pre-pour inspection and slab casting', 'Slab casting stage', 'Concrete quantity and supply schedule confirmation'),
    (template_id, 50, 6, 'Pre-pour inspection and slab casting', 'Slab casting stage', 'Pump, vibrator and backup equipment readiness'),
    (template_id, 51, 6, 'Pre-pour inspection and slab casting', 'Slab casting stage', 'Manpower and concrete placement sequence confirmation'),
    (template_id, 52, 6, 'Pre-pour inspection and slab casting', 'Slab casting stage', 'Pre-pour checklist approval'),
    (template_id, 53, 6, 'Pre-pour inspection and slab casting', 'Slab casting stage', 'Slab concreting'),
    (template_id, 54, 6, 'Pre-pour inspection and slab casting', 'Slab casting stage', 'Concrete compaction, finishing and level checks'),
    (template_id, 55, 6, 'Pre-pour inspection and slab casting', 'Slab casting stage', 'Curing initiation as specified'),
    (template_id, 56, 6, 'Pre-pour inspection and slab casting', 'Slab casting stage', 'Recording concrete pour details and inspection photographs')
  ON CONFLICT (template_id, step_number) DO NOTHING;
END $$;

-- ---------------------------------------------------------------------------
-- Seed a Pre-Slab progression (+ pending steps) for every existing floor
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  tpl_id UUID;
  floor_rec RECORD;
  prog_id UUID;
BEGIN
  SELECT id INTO tpl_id
  FROM public.progression_templates
  WHERE key = 'pre_slab_v1' AND is_active = TRUE
  LIMIT 1;

  IF tpl_id IS NULL THEN
    RAISE NOTICE '036: pre_slab_v1 template missing — skip floor seed';
    RETURN;
  END IF;

  FOR floor_rec IN
    SELECT f.id AS floor_id, f.building_id, b.project_id
    FROM public.floors f
    JOIN public.buildings b ON b.id = f.building_id
    WHERE f.deleted_at IS NULL
      AND b.deleted_at IS NULL
  LOOP
    SELECT id INTO prog_id
    FROM public.project_progressions
    WHERE floor_id = floor_rec.floor_id
      AND track = 'pre_slab'
      AND deleted_at IS NULL
    LIMIT 1;

    IF prog_id IS NULL THEN
      INSERT INTO public.project_progressions (project_id, floor_id, building_id, template_id, track)
      VALUES (floor_rec.project_id, floor_rec.floor_id, floor_rec.building_id, tpl_id, 'pre_slab')
      RETURNING id INTO prog_id;

      INSERT INTO public.project_progression_steps
        (progression_id, template_step_id, step_number, status)
      SELECT prog_id, s.id, s.step_number, 'pending'
      FROM public.progression_template_steps s
      WHERE s.template_id = tpl_id
      ORDER BY s.step_number;
    END IF;
  END LOOP;
END $$;

COMMENT ON COLUMN public.project_progressions.track IS
  'Checklist track for this floor: pre_slab (before casting) or post_slab (after casting).';
COMMENT ON COLUMN public.project_progression_steps.started_at IS
  'When work on this step started (Start button); started_by records who pressed it.';
COMMENT ON COLUMN public.project_progression_steps.ended_at IS
  'When work on this step ended (End button); mirrors completed_at for completed steps.';
