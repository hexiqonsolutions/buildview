-- =============================================================================
-- BuildView: Progression Report (post-slab construction checklist)
-- Construction Intelligence only — gated in app by clients.dashboard_type
-- =============================================================================

CREATE TABLE public.progression_templates (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key          TEXT NOT NULL UNIQUE,
  name         TEXT NOT NULL,
  version      INTEGER NOT NULL DEFAULT 1,
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.progression_template_steps (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_id    UUID NOT NULL REFERENCES public.progression_templates(id) ON DELETE CASCADE,
  step_number    INTEGER NOT NULL CHECK (step_number >= 1),
  phase_number   INTEGER NOT NULL CHECK (phase_number >= 1),
  phase_name     TEXT NOT NULL,
  phase_stage    TEXT NOT NULL DEFAULT '',
  title          TEXT NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT progression_template_steps_unique UNIQUE (template_id, step_number)
);

CREATE TABLE public.project_progressions (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id    UUID NOT NULL UNIQUE REFERENCES public.projects(id) ON DELETE CASCADE,
  template_id   UUID NOT NULL REFERENCES public.progression_templates(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by    UUID REFERENCES public.users(id) ON DELETE SET NULL,
  updated_by    UUID REFERENCES public.users(id) ON DELETE SET NULL,
  deleted_at    TIMESTAMPTZ,
  deleted_by    UUID REFERENCES public.users(id) ON DELETE SET NULL
);

CREATE TABLE public.project_progression_steps (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  progression_id     UUID NOT NULL REFERENCES public.project_progressions(id) ON DELETE CASCADE,
  template_step_id   UUID NOT NULL REFERENCES public.progression_template_steps(id),
  step_number        INTEGER NOT NULL,
  status             TEXT NOT NULL DEFAULT 'pending'
                       CHECK (status IN ('pending', 'completed')),
  completed_at       TIMESTAMPTZ,
  completed_by       UUID REFERENCES public.users(id) ON DELETE SET NULL,
  work_date          DATE,
  note               TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT project_progression_steps_unique UNIQUE (progression_id, template_step_id)
);

CREATE TABLE public.project_progression_logs (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  progression_id   UUID NOT NULL REFERENCES public.project_progressions(id) ON DELETE CASCADE,
  step_id          UUID NOT NULL REFERENCES public.project_progression_steps(id) ON DELETE CASCADE,
  action           TEXT NOT NULL CHECK (action IN ('completed', 'reopened')),
  work_date        DATE NOT NULL,
  actor_id         UUID REFERENCES public.users(id) ON DELETE SET NULL,
  note             TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX project_progressions_project_idx
  ON public.project_progressions (project_id)
  WHERE deleted_at IS NULL;

CREATE INDEX project_progression_steps_progression_idx
  ON public.project_progression_steps (progression_id, step_number);

CREATE INDEX project_progression_logs_progression_date_idx
  ON public.project_progression_logs (progression_id, work_date DESC);

CREATE INDEX project_progression_logs_step_idx
  ON public.project_progression_logs (step_id, created_at DESC);

CREATE TRIGGER trg_progression_templates_updated_at
  BEFORE UPDATE ON public.progression_templates
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_project_progressions_updated_at
  BEFORE UPDATE ON public.project_progressions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_project_progression_steps_updated_at
  BEFORE UPDATE ON public.project_progression_steps
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Seed: post_slab_v1 (56 steps)
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  template_id UUID;
BEGIN
  INSERT INTO public.progression_templates (key, name, version, is_active)
  VALUES ('post_slab_v1', 'Construction work sequence after slab casting', 1, TRUE)
  RETURNING id INTO template_id;

  INSERT INTO public.progression_template_steps
    (template_id, step_number, phase_number, phase_name, phase_stage, title)
  VALUES
    (template_id, 1, 1, 'Slab completion and preparation', 'Structural stage', 'Slab concreting completed'),
    (template_id, 2, 1, 'Slab completion and preparation', 'Structural stage', 'Concrete curing'),
    (template_id, 3, 1, 'Slab completion and preparation', 'Structural stage', 'De-shuttering and removal of slab formwork as permitted by the engineer'),
    (template_id, 4, 1, 'Slab completion and preparation', 'Structural stage', 'Removal of debris and cleaning of the floor'),
    (template_id, 5, 1, 'Slab completion and preparation', 'Structural stage', 'Structural inspection and checking slab levels'),
    (template_id, 6, 1, 'Slab completion and preparation', 'Structural stage', 'Marking of walls, room layouts, shafts and openings'),
    (template_id, 7, 2, 'Blockwork and masonry', 'Wall construction stage', 'Blockwork / AAC blockwork / brickwork'),
    (template_id, 8, 2, 'Blockwork and masonry', 'Wall construction stage', 'Internal partition walls and external infill walls'),
    (template_id, 9, 2, 'Blockwork and masonry', 'Wall construction stage', 'Door and window openings, lintels and sill-level provisions'),
    (template_id, 10, 2, 'Blockwork and masonry', 'Wall construction stage', 'Doorframe installation and alignment, where frames are embedded during masonry'),
    (template_id, 11, 2, 'Blockwork and masonry', 'Wall construction stage', 'Wall chasing and openings for electrical and plumbing services, coordinated with masonry'),
    (template_id, 12, 3, 'Concealed electrical and plumbing', 'First-fix MEP works', 'Electrical conduit installation in walls and slabs, as applicable'),
    (template_id, 13, 3, 'Concealed electrical and plumbing', 'First-fix MEP works', 'Switchboard boxes and electrical junction boxes'),
    (template_id, 14, 3, 'Concealed electrical and plumbing', 'First-fix MEP works', 'Concealed plumbing water-supply lines'),
    (template_id, 15, 3, 'Concealed electrical and plumbing', 'First-fix MEP works', 'Soil, waste and drainage pipes, including bathroom and kitchen connections'),
    (template_id, 16, 3, 'Concealed electrical and plumbing', 'First-fix MEP works', 'AC refrigerant piping, drain lines and other concealed services, if applicable'),
    (template_id, 17, 3, 'Concealed electrical and plumbing', 'First-fix MEP works', 'Electrical continuity checks and plumbing pressure/leak tests before covering'),
    (template_id, 18, 4, 'Sills, frames and plaster', 'Wall finishing preparation', 'Window sill installation — granite patti / stone sill'),
    (template_id, 19, 4, 'Sills, frames and plaster', 'Wall finishing preparation', 'Doorframe fixing and final alignment, if not already completed'),
    (template_id, 20, 4, 'Sills, frames and plaster', 'Wall finishing preparation', 'Electrical and plumbing chase filling'),
    (template_id, 21, 4, 'Sills, frames and plaster', 'Wall finishing preparation', 'Chicken mesh / fibre mesh at masonry-to-RCC junctions, where specified'),
    (template_id, 22, 4, 'Sills, frames and plaster', 'Wall finishing preparation', 'Internal wall plaster'),
    (template_id, 23, 4, 'Sills, frames and plaster', 'Wall finishing preparation', 'External wall plaster and façade base preparation'),
    (template_id, 24, 4, 'Sills, frames and plaster', 'Wall finishing preparation', 'Plaster curing and surface-level checks'),
    (template_id, 25, 5, 'Waterproofing and wet-area preparation', 'Wet areas', 'Bathroom and toilet floor-level preparation and slope formation'),
    (template_id, 26, 5, 'Waterproofing and wet-area preparation', 'Wet areas', 'Waterproofing in toilets, bathrooms, balconies and other specified areas'),
    (template_id, 27, 5, 'Waterproofing and wet-area preparation', 'Wet areas', 'Waterproofing upturns and pipe-junction treatment'),
    (template_id, 28, 5, 'Waterproofing and wet-area preparation', 'Wet areas', 'Water ponding test and rectification, where applicable'),
    (template_id, 29, 5, 'Waterproofing and wet-area preparation', 'Wet areas', 'Kitchen platform and plumbing point coordination'),
    (template_id, 30, 6, 'Flooring and stonework', 'Floor finishes', 'Floor base preparation and level marking'),
    (template_id, 31, 6, 'Flooring and stonework', 'Floor finishes', 'Bathroom and toilet floor tiles with correct slope'),
    (template_id, 32, 6, 'Flooring and stonework', 'Floor finishes', 'Bathroom wall tiles'),
    (template_id, 33, 6, 'Flooring and stonework', 'Floor finishes', 'Kitchen dado tiles, where specified'),
    (template_id, 34, 6, 'Flooring and stonework', 'Floor finishes', 'Room flooring — tiles, marble or other specified material'),
    (template_id, 35, 6, 'Flooring and stonework', 'Floor finishes', 'Door thresholds / granite patti'),
    (template_id, 36, 6, 'Flooring and stonework', 'Floor finishes', 'Skirting and tile grouting'),
    (template_id, 37, 6, 'Flooring and stonework', 'Floor finishes', 'Staircase stonework and common-area flooring, as applicable'),
    (template_id, 38, 7, 'Windows, façade and painting', 'Façade & paint', 'Window frame and shutter installation'),
    (template_id, 39, 7, 'Windows, façade and painting', 'Façade & paint', 'External façade works, including plaster finishes, texture or cladding'),
    (template_id, 40, 7, 'Windows, façade and painting', 'Façade & paint', 'Internal wall putty and surface preparation'),
    (template_id, 41, 7, 'Windows, façade and painting', 'Façade & paint', 'Primer application'),
    (template_id, 42, 7, 'Windows, façade and painting', 'Façade & paint', 'First coat of paint'),
    (template_id, 43, 8, 'Fixtures and second-fix services', 'Fixtures & MEP', 'Door shutters, hardware and locks'),
    (template_id, 44, 8, 'Fixtures and second-fix services', 'Fixtures & MEP', 'Electrical wires, switches, sockets and distribution board connections'),
    (template_id, 45, 8, 'Fixtures and second-fix services', 'Fixtures & MEP', 'Sanitaryware, WC, washbasin and bathroom fittings'),
    (template_id, 46, 8, 'Fixtures and second-fix services', 'Fixtures & MEP', 'Plumbing taps, mixers and accessories'),
    (template_id, 47, 8, 'Fixtures and second-fix services', 'Fixtures & MEP', 'Kitchen platform, sink and related fittings'),
    (template_id, 48, 8, 'Fixtures and second-fix services', 'Fixtures & MEP', 'False ceiling and light fixtures, where specified'),
    (template_id, 49, 8, 'Fixtures and second-fix services', 'Fixtures & MEP', 'AC indoor units and other MEP equipment, where applicable'),
    (template_id, 50, 9, 'Final finishing and handover', 'Handover', 'Final paint coat and touch-ups'),
    (template_id, 51, 9, 'Final finishing and handover', 'Handover', 'Sealant application and finishing corrections'),
    (template_id, 52, 9, 'Final finishing and handover', 'Handover', 'Electrical testing and functional checks'),
    (template_id, 53, 9, 'Final finishing and handover', 'Handover', 'Plumbing leak checks and drainage-flow testing'),
    (template_id, 54, 9, 'Final finishing and handover', 'Handover', 'Door, window and hardware operation checks'),
    (template_id, 55, 9, 'Final finishing and handover', 'Handover', 'Snagging inspection and defect rectification'),
    (template_id, 56, 9, 'Final finishing and handover', 'Handover', 'Deep cleaning and final handover');
END $$;

-- ---------------------------------------------------------------------------
-- Access helpers
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.can_edit_progression(project_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role_text TEXT;
  user_client_id UUID;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_active_authenticated_user() THEN
    RETURN FALSE;
  END IF;

  IF public.is_buildview_staff() THEN
    RETURN TRUE;
  END IF;

  SELECT role::text, client_id
    INTO user_role_text, user_client_id
  FROM public.users
  WHERE id = auth.uid()
    AND is_active = TRUE
    AND deleted_at IS NULL;

  IF user_role_text IS NULL THEN
    RETURN FALSE;
  END IF;

  IF user_role_text NOT IN ('client_admin', 'site_engineer', 'site_supervisor') THEN
    RETURN FALSE;
  END IF;

  -- Client admin: any project under their organization
  IF user_role_text = 'client_admin' AND user_client_id IS NOT NULL THEN
    RETURN EXISTS (
      SELECT 1
      FROM public.projects p
      WHERE p.id = project_uuid
        AND p.client_id = user_client_id
        AND p.deleted_at IS NULL
    );
  END IF;

  -- Site engineer / supervisor: assigned projects only
  RETURN EXISTS (
    SELECT 1
    FROM public.project_assignments pa
    INNER JOIN public.projects p ON p.id = pa.project_id
    WHERE pa.project_id = project_uuid
      AND pa.user_id = auth.uid()
      AND pa.deleted_at IS NULL
      AND p.deleted_at IS NULL
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.can_edit_progression(UUID) TO authenticated;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

ALTER TABLE public.progression_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.progression_templates FORCE ROW LEVEL SECURITY;
ALTER TABLE public.progression_template_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.progression_template_steps FORCE ROW LEVEL SECURITY;
ALTER TABLE public.project_progressions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_progressions FORCE ROW LEVEL SECURITY;
ALTER TABLE public.project_progression_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_progression_steps FORCE ROW LEVEL SECURITY;
ALTER TABLE public.project_progression_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_progression_logs FORCE ROW LEVEL SECURITY;

CREATE POLICY "progression_templates_read"
  ON public.progression_templates
  FOR SELECT
  TO authenticated
  USING (public.is_active_authenticated_user());

CREATE POLICY "progression_template_steps_read"
  ON public.progression_template_steps
  FOR SELECT
  TO authenticated
  USING (public.is_active_authenticated_user());

CREATE POLICY "project_progressions_select"
  ON public.project_progressions
  FOR SELECT
  TO authenticated
  USING (
    deleted_at IS NULL
    AND (public.is_buildview_staff() OR public.has_project_access(project_id))
  );

CREATE POLICY "project_progressions_insert"
  ON public.project_progressions
  FOR INSERT
  TO authenticated
  WITH CHECK (public.can_edit_progression(project_id));

CREATE POLICY "project_progressions_update"
  ON public.project_progressions
  FOR UPDATE
  TO authenticated
  USING (public.can_edit_progression(project_id))
  WITH CHECK (public.can_edit_progression(project_id));

CREATE POLICY "project_progression_steps_select"
  ON public.project_progression_steps
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.project_progressions pp
      WHERE pp.id = progression_id
        AND pp.deleted_at IS NULL
        AND (public.is_buildview_staff() OR public.has_project_access(pp.project_id))
    )
  );

CREATE POLICY "project_progression_steps_update"
  ON public.project_progression_steps
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.project_progressions pp
      WHERE pp.id = progression_id
        AND pp.deleted_at IS NULL
        AND public.can_edit_progression(pp.project_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.project_progressions pp
      WHERE pp.id = progression_id
        AND pp.deleted_at IS NULL
        AND public.can_edit_progression(pp.project_id)
    )
  );

CREATE POLICY "project_progression_steps_insert"
  ON public.project_progression_steps
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.project_progressions pp
      WHERE pp.id = progression_id
        AND pp.deleted_at IS NULL
        AND public.can_edit_progression(pp.project_id)
    )
  );

CREATE POLICY "project_progression_logs_select"
  ON public.project_progression_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.project_progressions pp
      WHERE pp.id = progression_id
        AND pp.deleted_at IS NULL
        AND (public.is_buildview_staff() OR public.has_project_access(pp.project_id))
    )
  );

CREATE POLICY "project_progression_logs_insert"
  ON public.project_progression_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.project_progressions pp
      WHERE pp.id = progression_id
        AND pp.deleted_at IS NULL
        AND public.can_edit_progression(pp.project_id)
    )
  );

COMMENT ON TABLE public.progression_templates IS
  'Versioned construction progression templates (e.g. post-slab 56-step sequence).';
COMMENT ON TABLE public.project_progressions IS
  'One active Progression Report instance per construction project.';
COMMENT ON TABLE public.project_progression_steps IS
  'Per-project checklist step status; ticks convert to overall and phase %.';
COMMENT ON TABLE public.project_progression_logs IS
  'Append-only audit of completed / reopened ticks with work date.';
COMMENT ON FUNCTION public.can_edit_progression(UUID) IS
  'BuildView staff, or client_admin / site_engineer / site_supervisor with project access.';
