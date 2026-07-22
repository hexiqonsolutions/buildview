-- Allow all BuildView staff to manage buildings/floors (not only super_admin)

DROP POLICY IF EXISTS "buildings_staff_all" ON public.buildings;
DROP POLICY IF EXISTS "floors_staff_all" ON public.floors;

CREATE POLICY "buildings_staff_all"
  ON public.buildings FOR ALL
  TO authenticated
  USING (public.is_buildview_staff())
  WITH CHECK (public.is_buildview_staff());

CREATE POLICY "floors_staff_all"
  ON public.floors FOR ALL
  TO authenticated
  USING (public.is_buildview_staff())
  WITH CHECK (public.is_buildview_staff());
