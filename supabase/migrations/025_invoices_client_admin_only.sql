-- =============================================================================
-- Invoices: client portal read limited to Client Admin
-- =============================================================================
-- BuildView staff keep full access via is_buildview_staff / super_admin policies.
-- Other client roles must not see billing records.

DROP POLICY IF EXISTS "invoices_client_select" ON public.invoices;
DROP POLICY IF EXISTS "invoices_staff_all" ON public.invoices;

CREATE POLICY "invoices_staff_all"
  ON public.invoices
  FOR ALL
  TO authenticated
  USING (public.is_buildview_staff())
  WITH CHECK (public.is_buildview_staff());

CREATE POLICY "invoices_client_admin_select"
  ON public.invoices
  FOR SELECT
  TO authenticated
  USING (
    client_id = public.get_my_client_id()
    AND deleted_at IS NULL
    AND EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.id = auth.uid()
        AND u.role = 'client_admin'
        AND u.is_active = TRUE
        AND u.deleted_at IS NULL
    )
  );
