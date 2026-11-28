-- =============================================================================
-- 059 — Everyone on Progression v2
--
-- * New projects start on v2 (Inside / Outside / Site lists).
-- * Every Construction Intelligence project still on v1 is moved to v2 with
--   reconcile_progression_v2 (migration 057): recorded work carries over by
--   step key / alias; old checklists are archived, not deleted.
--   Interior / Real Estate showcase projects are left alone.
--
-- Apply in Supabase → SQL Editor after 057. Safe to re-run.
-- =============================================================================

ALTER TABLE public.projects ALTER COLUMN progression_version SET DEFAULT 2;

DO $$
DECLARE
  r RECORD;
  v_moved INT := 0;
BEGIN
  FOR r IN
    SELECT p.id, p.name
      FROM public.projects p
      LEFT JOIN public.clients c ON c.id = p.client_id
     WHERE p.deleted_at IS NULL
       AND COALESCE(c.dashboard_type, 'construction') = 'construction'
       AND COALESCE(p.progression_version, 1) = 1
  LOOP
    PERFORM public.reconcile_progression_v2(r.id, NULL);
    v_moved := v_moved + 1;
    RAISE NOTICE 'Moved to v2: %', r.name;
  END LOOP;
  RAISE NOTICE 'Projects moved: %', v_moved;
END $$;

NOTIFY pgrst, 'reload schema';

-- Check: construction projects and their version (all should be 2).
SELECT p.name, p.progression_version
  FROM public.projects p
  LEFT JOIN public.clients c ON c.id = p.client_id
 WHERE p.deleted_at IS NULL AND COALESCE(c.dashboard_type, 'construction') = 'construction'
 ORDER BY p.name;
