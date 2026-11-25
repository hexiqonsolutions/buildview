-- =============================================================================
-- 054 — Move checklists to each floor's construction method, in the database
--
-- reconcile_construction_methods(project, actor): for every floor + track whose
-- active checklist uses another method's template, archive it (soft delete) and
-- create the matching one. Steps with the same step_key keep status, dates,
-- evidence and verification. One transaction, so it is all-or-nothing and fast
-- (the app-side loop timed out on large projects).
--
-- Also repairs a floor + track left without an active checklist by an
-- interrupted switch: it is rebuilt from the latest archived checklist.
--
-- Service role only. Apply in Supabase → SQL Editor. Safe to re-run.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.reconcile_construction_methods(p_project UUID, p_actor UUID DEFAULT NULL)
RETURNS TABLE (switched INT, carried INT, dropped INT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_project_method TEXT;
  r            RECORD;
  v_template   UUID;
  v_active     RECORD;
  v_source     RECORD;
  v_new        UUID;
  v_started    INT;
  v_carried    INT;
  v_switched   INT := 0;
  v_carried_t  INT := 0;
  v_dropped_t  INT := 0;
BEGIN
  SELECT COALESCE(construction_method, 'conventional') INTO v_project_method
    FROM public.projects WHERE id = p_project;
  IF NOT FOUND THEN RETURN; END IF;

  FOR r IN
    SELECT f.id AS floor_id, b.id AS building_id, t.track,
           COALESCE(f.construction_method, b.construction_method, v_project_method, 'conventional') AS method
      FROM public.floors f
      JOIN public.buildings b ON b.id = f.building_id
     CROSS JOIN (VALUES ('pre_slab'), ('post_slab')) AS t(track)
     WHERE b.project_id = p_project AND b.deleted_at IS NULL AND f.deleted_at IS NULL
  LOOP
    SELECT id INTO v_template FROM public.progression_templates
     WHERE key = CASE WHEN r.method = 'conventional' THEN r.track || '_v1'
                      ELSE r.track || '_' || r.method || '_v1' END
       AND is_active
     LIMIT 1;
    IF v_template IS NULL THEN CONTINUE; END IF;

    SELECT * INTO v_active FROM public.project_progressions
     WHERE floor_id = r.floor_id AND track = r.track AND deleted_at IS NULL
     LIMIT 1;

    IF FOUND THEN
      IF v_active.template_id = v_template THEN CONTINUE; END IF;
      v_source := v_active;
      UPDATE public.project_progressions
         SET deleted_at = NOW(), deleted_by = p_actor
       WHERE id = v_active.id;
    ELSE
      -- Repair: no active checklist, but an archived one with recorded work.
      SELECT pp.* INTO v_source FROM public.project_progressions pp
       WHERE pp.floor_id = r.floor_id AND pp.track = r.track AND pp.deleted_at IS NOT NULL
         AND EXISTS (SELECT 1 FROM public.project_progression_steps s
                      WHERE s.progression_id = pp.id AND s.status <> 'pending')
       ORDER BY pp.deleted_at DESC
       LIMIT 1;
      IF NOT FOUND THEN CONTINUE; END IF;
    END IF;

    INSERT INTO public.project_progressions
      (project_id, floor_id, building_id, template_id, track,
       planned_start_date, planned_end_date, created_by, updated_by)
    VALUES (p_project, r.floor_id, r.building_id, v_template, r.track,
            v_source.planned_start_date, v_source.planned_end_date, p_actor, p_actor)
    RETURNING id INTO v_new;

    INSERT INTO public.project_progression_steps
      (progression_id, template_step_id, step_number, status,
       started_at, started_by, ended_at, ended_by, completed_at, completed_by,
       work_date, note, evidence_tour_id, evidence_note,
       verification_status, verified_by, verified_at, verification_note, source)
    SELECT v_new, ts.id, ts.step_number, COALESCE(o.status, 'pending'),
           o.started_at, o.started_by, o.ended_at, o.ended_by, o.completed_at, o.completed_by,
           o.work_date, o.note, o.evidence_tour_id, o.evidence_note,
           o.verification_status, o.verified_by, o.verified_at, o.verification_note,
           COALESCE(o.source, 'manual')
      FROM public.progression_template_steps ts
      LEFT JOIN LATERAL (
        SELECT s.*
          FROM public.project_progression_steps s
          JOIN public.progression_template_steps ots ON ots.id = s.template_step_id
         WHERE s.progression_id = v_source.id
           AND s.status <> 'pending'
           AND ots.step_key = ts.step_key
         LIMIT 1
      ) o ON TRUE
     WHERE ts.template_id = v_template;

    SELECT COUNT(*) INTO v_carried FROM public.project_progression_steps
     WHERE progression_id = v_new AND status <> 'pending';
    SELECT COUNT(*) INTO v_started FROM public.project_progression_steps
     WHERE progression_id = v_source.id AND status <> 'pending';

    v_switched := v_switched + 1;
    v_carried_t := v_carried_t + v_carried;
    v_dropped_t := v_dropped_t + GREATEST(0, v_started - v_carried);
  END LOOP;

  RETURN QUERY SELECT v_switched, v_carried_t, v_dropped_t;
END;
$$;

REVOKE ALL ON FUNCTION public.reconcile_construction_methods(UUID, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reconcile_construction_methods(UUID, UUID) TO service_role;

NOTIFY pgrst, 'reload schema';

-- Check: the function exists (1 row).
SELECT proname FROM pg_proc WHERE proname = 'reconcile_construction_methods';
