-- =============================================================================
-- 047 — Progression evidence + verification (Definable Completion, Milestone 3)
--
-- Each checklist step can link to the 360 scan that proves it, and be verified
-- or rejected by a verifier (BuildView staff or the client's Client Admin).
-- A per-project switch makes only verified steps count toward completion %.
-- `source` (manual | ai) prepares for AI-suggested progress that a human verifies.
--
-- Apply in Supabase → SQL Editor. Safe to re-run.
-- =============================================================================

ALTER TABLE public.project_progression_steps
  ADD COLUMN IF NOT EXISTS evidence_tour_id UUID REFERENCES public.project_tours(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS evidence_note TEXT,
  ADD COLUMN IF NOT EXISTS verification_status TEXT,
  ADD COLUMN IF NOT EXISTS verified_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS verification_note TEXT,
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'manual';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'project_progression_steps_verification_status_check'
      AND conrelid = 'public.project_progression_steps'::regclass
  ) THEN
    ALTER TABLE public.project_progression_steps
      ADD CONSTRAINT project_progression_steps_verification_status_check
      CHECK (verification_status IS NULL OR verification_status IN ('verified', 'rejected'));
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'project_progression_steps_source_check'
      AND conrelid = 'public.project_progression_steps'::regclass
  ) THEN
    ALTER TABLE public.project_progression_steps
      ADD CONSTRAINT project_progression_steps_source_check
      CHECK (source IN ('manual', 'ai'));
  END IF;
END $$;

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS progress_verified_only BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN public.projects.progress_verified_only IS
  'When true, only verified checklist steps count toward completion %.';

-- Log the new actions.
ALTER TABLE public.project_progression_logs
  DROP CONSTRAINT IF EXISTS project_progression_logs_action_check;
ALTER TABLE public.project_progression_logs
  ADD CONSTRAINT project_progression_logs_action_check
  CHECK (action IN (
    'completed', 'reopened', 'started', 'ended', 'reset', 'date_corrected',
    'verified', 'rejected', 'evidence_linked', 'evidence_cleared'
  ));

-- Who may verify: BuildView staff, or the Client Admin of the project's client.
CREATE OR REPLACE FUNCTION public.can_verify_progression(project_uuid UUID)
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
  SELECT role::text, client_id INTO user_role_text, user_client_id
  FROM public.users
  WHERE id = auth.uid() AND is_active = TRUE AND deleted_at IS NULL;
  IF user_role_text <> 'client_admin' OR user_client_id IS NULL THEN
    RETURN FALSE;
  END IF;
  RETURN EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = project_uuid AND p.client_id = user_client_id AND p.deleted_at IS NULL
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.can_verify_progression(UUID) TO authenticated;

-- Guard + housekeeping on step updates:
--  * a step that is restarted, reset or has its end changed loses its verification;
--  * direct (non-service) writes to verification fields need can_verify_progression.
CREATE OR REPLACE FUNCTION public.progression_steps_verification_guard()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_project UUID;
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status
     OR NEW.ended_at IS DISTINCT FROM OLD.ended_at
     OR NEW.work_date IS DISTINCT FROM OLD.work_date THEN
    NEW.verification_status := NULL;
    NEW.verified_by := NULL;
    NEW.verified_at := NULL;
    NEW.verification_note := NULL;
    RETURN NEW;
  END IF;

  IF auth.uid() IS NOT NULL AND (
       NEW.verification_status IS DISTINCT FROM OLD.verification_status
       OR NEW.verified_by IS DISTINCT FROM OLD.verified_by
       OR NEW.verified_at IS DISTINCT FROM OLD.verified_at
     ) THEN
    SELECT pp.project_id INTO v_project
    FROM public.project_progressions pp WHERE pp.id = NEW.progression_id;
    IF NOT public.can_verify_progression(v_project) THEN
      RAISE EXCEPTION 'Only BuildView staff or the Client Admin can verify progress.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_progression_steps_verification_guard ON public.project_progression_steps;
CREATE TRIGGER trg_progression_steps_verification_guard
  BEFORE UPDATE ON public.project_progression_steps
  FOR EACH ROW EXECUTE FUNCTION public.progression_steps_verification_guard();

CREATE INDEX IF NOT EXISTS project_progression_steps_evidence_tour_idx
  ON public.project_progression_steps (evidence_tour_id)
  WHERE evidence_tour_id IS NOT NULL;

NOTIFY pgrst, 'reload schema';
