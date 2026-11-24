-- =============================================================================
-- 050 — Zone setup for client progression editors
--
-- Zones, N/A trades, floor plans and outlines may now be managed by the same
-- people who update progress: BuildView staff, Client Admin, Site Supervisor
-- and Site Engineer on the project (public.can_edit_progression).
-- Trade weights and stage credits stay BuildView-staff only.
--
-- Apply in Supabase → SQL Editor. Safe to re-run.
-- =============================================================================

DROP POLICY IF EXISTS "progress_zones_staff" ON public.progress_zones;
DROP POLICY IF EXISTS "progress_zones_editors" ON public.progress_zones;
CREATE POLICY "progress_zones_editors" ON public.progress_zones
  FOR ALL TO authenticated
  USING (public.can_edit_progression(project_id))
  WITH CHECK (public.can_edit_progression(project_id));

DROP POLICY IF EXISTS "progress_zone_na_staff" ON public.progress_zone_na;
DROP POLICY IF EXISTS "progress_zone_na_editors" ON public.progress_zone_na;
CREATE POLICY "progress_zone_na_editors" ON public.progress_zone_na
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.progress_zones z
    WHERE z.id = zone_id AND public.can_edit_progression(z.project_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.progress_zones z
    WHERE z.id = zone_id AND public.can_edit_progression(z.project_id)
  ));

NOTIFY pgrst, 'reload schema';
