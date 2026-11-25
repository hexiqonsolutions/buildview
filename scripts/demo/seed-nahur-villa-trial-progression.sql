-- =============================================================================
-- DEMO DATA ONLY: a half-done progression on the "Nahur villa trial" project
-- (537ae26d-7a74-4715-b618-f500d82fa209) so Completion, the S-curve, zones,
-- plans and the PDF report all have something to show.
--
-- What it does (trial project only):
--   1. CLEARS the project's existing progression data (checklists, logs, zones,
--      zone updates, trade plans, snapshots).
--   2. If the project has no floors, adds "Tower A" with Floors 1–6.
--   3. Checklists for every floor and both tracks, each on its own construction
--      method's checklist (Conventional / Mivan / Hybrid, set in the app). Towers run in parallel
--      (each starts 20 days after the previous), floors 8 days apart, so the
--      project is about half done today. Steps ended on dates spread up to
--      today, floors ahead / on / behind plan. Older steps verified; the last
--      2 weeks pending.
--   4. Zones on Floors 3 and 4 of the first tower (flats + a lobby), trade
--      updates over time, and a trade plan for those floors.
--   5. Turns "count only verified" OFF so recorded work shows.
--
-- Run in Supabase → SQL Editor. Safe to re-run (it starts by clearing).
-- =============================================================================

DO $$
DECLARE
  v_project   UUID := '537ae26d-7a74-4715-b618-f500d82fa209';
  v_today     DATE := (NOW() AT TIME ZONE 'Asia/Kolkata')::date;
  v_actor     UUID;
  v_tour      UUID;
  v_building  UUID;
  v_floor     RECORD;
  v_i         INT := 0;
  v_track     TEXT;
  v_template  UUID;
  v_prog      UUID;
  v_steps     INT;
  v_done      INT;
  v_start     DATE;
  v_end       DATE;
  v_span      INT;
  v_frac      NUMERIC;
  v_pace      NUMERIC;
  v_step      RECORD;
  v_j         INT;
  v_date      DATE;
  v_zone      UUID;
  v_zfloor    INT := 0;
  v_zstart    DATE;
  v_t         INT;
  v_act       RECORD;
  v_z         RECORD;
  v_zi        INT;
  v_obs_date  DATE;
  v_stage     TEXT;
  v_paces     NUMERIC[] := ARRAY[1.10, 1.00, 0.90, 0.80, 0.95, 0.70, 0.85, 0.60];
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.projects WHERE id = v_project) THEN
    RAISE EXCEPTION 'Nahur villa trial project not found';
  END IF;

  SELECT id INTO v_actor FROM public.users
   WHERE role IN ('super_admin', 'admin') ORDER BY created_at LIMIT 1;
  SELECT id INTO v_tour FROM public.project_tours
   WHERE project_id = v_project AND deleted_at IS NULL
   ORDER BY capture_date DESC NULLS LAST, created_at DESC LIMIT 1;

  -- 1. Clear existing progression data on this project only.
  DELETE FROM public.progress_observations WHERE project_id = v_project;
  DELETE FROM public.progress_zones WHERE project_id = v_project;
  DELETE FROM public.completion_activity_plans WHERE project_id = v_project;
  DELETE FROM public.completion_snapshots WHERE project_id = v_project;
  DELETE FROM public.project_progressions WHERE project_id = v_project;  -- cascades steps + logs
  UPDATE public.projects SET progress_verified_only = FALSE WHERE id = v_project;

  -- 2. Building + floors if missing.
  IF NOT EXISTS (
    SELECT 1 FROM public.floors f JOIN public.buildings b ON b.id = f.building_id
     WHERE b.project_id = v_project AND b.deleted_at IS NULL AND f.deleted_at IS NULL
  ) THEN
    INSERT INTO public.buildings (project_id, name, sort_order)
    VALUES (v_project, 'Tower A', 1)
    ON CONFLICT (project_id, name) DO UPDATE SET deleted_at = NULL
    RETURNING id INTO v_building;
    FOR v_j IN 1..6 LOOP
      INSERT INTO public.floors (building_id, name, sort_order)
      VALUES (v_building, 'Floor ' || v_j, v_j);
    END LOOP;
  END IF;

  -- 3. Checklists, schedules and ended steps per floor.
  FOR v_floor IN
    SELECT f.id, f.building_id,
           -- Construction method (migration 053): floor, else building, else project.
           COALESCE(f.construction_method, b.construction_method, pr.construction_method, 'conventional') AS method,
           (ROW_NUMBER() OVER (PARTITION BY b.id ORDER BY f.sort_order, f.name) - 1)::int AS k,
           (DENSE_RANK() OVER (ORDER BY b.sort_order, lower(b.name), b.id) - 1)::int AS bi
      FROM public.floors f JOIN public.buildings b ON b.id = f.building_id
      JOIN public.projects pr ON pr.id = b.project_id
     WHERE b.project_id = v_project AND b.deleted_at IS NULL AND f.deleted_at IS NULL
     ORDER BY b.sort_order, lower(b.name), f.sort_order, f.name
  LOOP
    v_pace := v_paces[1 + (v_i % array_length(v_paces, 1))];

    FOREACH v_track IN ARRAY ARRAY['pre_slab', 'post_slab'] LOOP
      SELECT id INTO v_template FROM public.progression_templates
       WHERE key = CASE WHEN v_floor.method = 'conventional' THEN v_track || '_v1'
                        ELSE v_track || '_' || v_floor.method || '_v1' END
         AND is_active LIMIT 1;
      IF v_template IS NULL THEN RAISE EXCEPTION 'Active % template missing for %', v_track, v_floor.method; END IF;

      -- Pre-slab: 40 days from 1 Jun + 20 days per tower + 8 days per floor.
      -- Post-slab follows 5 days later and takes 120 days.
      IF v_track = 'pre_slab' THEN
        v_start := DATE '2026-06-01' + v_floor.bi * 20 + v_floor.k * 8;
        -- Mivan / hybrid structure cycle is faster than conventional formwork.
        v_end   := v_start + CASE WHEN v_floor.method = 'conventional' THEN 40 ELSE 21 END;
      ELSE
        v_start := DATE '2026-06-01' + v_floor.bi * 20 + v_floor.k * 8 + 45;
        v_end   := v_start + 120;
      END IF;

      INSERT INTO public.project_progressions
        (project_id, floor_id, building_id, template_id, track, planned_start_date, planned_end_date, created_by, updated_by)
      VALUES (v_project, v_floor.id, v_floor.building_id, v_template, v_track, v_start, v_end, v_actor, v_actor)
      RETURNING id INTO v_prog;

      INSERT INTO public.project_progression_steps (progression_id, template_step_id, step_number, status)
      SELECT v_prog, ts.id, ts.step_number, 'pending'
        FROM public.progression_template_steps ts WHERE ts.template_id = v_template;

      SELECT COUNT(*) INTO v_steps FROM public.project_progression_steps WHERE progression_id = v_prog;

      -- Share done = time elapsed on the plan × this floor's pace (ahead / behind).
      IF v_today <= v_start THEN
        v_frac := 0;
      ELSE
        v_frac := LEAST(1, ((LEAST(v_today, v_end) - v_start)::numeric / GREATEST(1, v_end - v_start)) * v_pace);
      END IF;
      v_done := FLOOR(v_frac * v_steps);
      v_span := GREATEST(1, LEAST(v_today, v_end) - v_start);

      v_j := 0;
      FOR v_step IN
        SELECT id FROM public.project_progression_steps WHERE progression_id = v_prog ORDER BY step_number
      LOOP
        IF v_j < v_done THEN
          v_date := LEAST(v_today, v_start + ((v_j + 1) * v_span / GREATEST(1, v_done)));
          UPDATE public.project_progression_steps SET
            status = 'completed',
            started_at = (v_date - 2)::timestamp + TIME '09:30',
            started_by = v_actor,
            ended_at = v_date::timestamp + TIME '17:00',
            ended_by = v_actor,
            completed_at = v_date::timestamp + TIME '17:00',
            completed_by = v_actor,
            work_date = v_date,
            evidence_tour_id = CASE WHEN v_tour IS NOT NULL AND v_j % 5 = 0 THEN v_tour END,
            verification_status = CASE WHEN v_date < v_today - 14 THEN 'verified' END,
            verified_by = CASE WHEN v_date < v_today - 14 THEN v_actor END,
            verified_at = CASE WHEN v_date < v_today - 14 THEN (v_date + 3)::timestamp + TIME '11:00' END,
            note = 'Demo data'
          WHERE id = v_step.id;
          INSERT INTO public.project_progression_logs (progression_id, step_id, action, work_date, actor_id, note)
          VALUES (v_prog, v_step.id, 'started', v_date - 2, v_actor, 'Demo data'),
                 (v_prog, v_step.id, 'ended', v_date, v_actor, 'Demo data');
        ELSIF v_j = v_done AND v_done > 0 AND v_done < v_steps THEN
          UPDATE public.project_progression_steps SET
            status = 'in_progress',
            started_at = (v_today - 3)::timestamp + TIME '09:30',
            started_by = v_actor,
            work_date = v_today - 3,
            note = 'Demo data'
          WHERE id = v_step.id;
          INSERT INTO public.project_progression_logs (progression_id, step_id, action, work_date, actor_id, note)
          VALUES (v_prog, v_step.id, 'started', v_today - 3, v_actor, 'Demo data');
        END IF;
        v_j := v_j + 1;
      END LOOP;

      -- Verify in a separate pass: the 047 trigger clears verification in the
      -- same update that changes a step's status / end date.
      UPDATE public.project_progression_steps SET
        verification_status = 'verified',
        verified_by = v_actor,
        verified_at = (work_date + 3)::timestamp + TIME '11:00'
      WHERE progression_id = v_prog AND status = 'completed' AND work_date < v_today - 14;
    END LOOP;

    -- 4. Zones on the 3rd and 4th floors (flats + lobby), with trade updates and a plan.
    IF v_floor.bi = 0 AND v_floor.k IN (2, 3) THEN
      v_zstart := DATE '2026-08-10' + v_zfloor * 35;
      v_zi := 0;
      FOR v_z IN
        SELECT * FROM (VALUES
          ((v_floor.k + 1) || '01', 'flat', 1150::numeric),
          ((v_floor.k + 1) || '02', 'flat', 1250::numeric),
          ((v_floor.k + 1) || '03', 'flat',  950::numeric),
          ((v_floor.k + 1) || '04', 'flat', 1400::numeric),
          ('Lobby ' || (v_floor.k + 1), 'common', 600::numeric)
        ) AS z(name, ztype, area)
      LOOP
        INSERT INTO public.progress_zones (project_id, floor_id, name, zone_type, area_sqft, sort_order, created_by)
        VALUES (v_project, v_floor.id, v_z.name, v_z.ztype, v_z.area, v_zi + 1, v_actor)
        RETURNING id INTO v_zone;
        IF v_z.ztype = 'common' THEN
          INSERT INTO public.progress_zone_na (zone_id, activity_key) VALUES (v_zone, 'services')
          ON CONFLICT DO NOTHING;
        END IF;

        -- Each trade starts 20 days after the previous one; Started → Half done → Done 10 days apart.
        v_t := 0;
        FOR v_act IN
          SELECT key FROM public.completion_activities
           WHERE project_id IS NULL
             AND COALESCE(method, 'conventional') = (SELECT COALESCE(construction_method, 'conventional') FROM public.projects WHERE id = v_project)
           ORDER BY sort_order
        LOOP
          IF NOT (v_z.ztype = 'common' AND v_act.key = 'services') THEN
            FOREACH v_stage IN ARRAY ARRAY['started', 'half', 'done'] LOOP
              v_obs_date := v_zstart + v_zi * 4 + v_t * 20
                            + CASE v_stage WHEN 'started' THEN 0 WHEN 'half' THEN 10 ELSE 20 END;
              EXIT WHEN v_obs_date > v_today;
              INSERT INTO public.progress_observations
                (project_id, zone_id, activity_key, stage_key, observed_on, evidence_tour_id, note, source,
                 entered_by, verification_status, verified_by, verified_at, created_at)
              VALUES (
                v_project, v_zone, v_act.key, v_stage, v_obs_date,
                CASE WHEN v_tour IS NOT NULL AND v_stage = 'done' THEN v_tour END,
                'Demo data', 'manual', v_actor,
                CASE WHEN v_obs_date < v_today - 10 THEN 'verified' END,
                CASE WHEN v_obs_date < v_today - 10 THEN v_actor END,
                CASE WHEN v_obs_date < v_today - 10 THEN (v_obs_date + 2)::timestamp + TIME '11:00' END,
                v_obs_date::timestamp + TIME '16:00'
              );
            END LOOP;
          END IF;
          v_t := v_t + 1;
        END LOOP;
        v_zi := v_zi + 1;
      END LOOP;

      -- Trade plan: a little faster than the work above (trade every 18 days, 30 days each).
      v_t := 0;
      FOR v_act IN
        SELECT key FROM public.completion_activities
           WHERE project_id IS NULL
             AND COALESCE(method, 'conventional') = (SELECT COALESCE(construction_method, 'conventional') FROM public.projects WHERE id = v_project)
           ORDER BY sort_order
      LOOP
        INSERT INTO public.completion_activity_plans
          (project_id, floor_id, activity_key, planned_start, planned_end, updated_by)
        VALUES (v_project, v_floor.id, v_act.key, v_zstart + v_t * 18, v_zstart + v_t * 18 + 30, v_actor);
        v_t := v_t + 1;
      END LOOP;
      v_zfloor := v_zfloor + 1;
    END IF;

    v_i := v_i + 1;
  END LOOP;

  RAISE NOTICE 'Demo progression seeded on % floors', v_i;
END $$;

-- Check: per floor and track, steps ended / in progress / total.
SELECT b.name AS building, f.name AS floor, p.track,
       p.planned_start_date, p.planned_end_date,
       COUNT(*) FILTER (WHERE s.status = 'completed')   AS ended,
       COUNT(*) FILTER (WHERE s.status = 'in_progress') AS in_progress,
       COUNT(*) AS total
  FROM public.project_progressions p
  JOIN public.floors f ON f.id = p.floor_id
  JOIN public.buildings b ON b.id = f.building_id
  JOIN public.project_progression_steps s ON s.progression_id = p.id
 WHERE p.project_id = '537ae26d-7a74-4715-b618-f500d82fa209' AND p.deleted_at IS NULL
 GROUP BY b.name, b.sort_order, f.name, f.sort_order, p.track, p.planned_start_date, p.planned_end_date
 ORDER BY b.sort_order, f.sort_order, p.track;
