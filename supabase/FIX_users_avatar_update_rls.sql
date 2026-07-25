-- =============================================================================
-- FIX: Allow every active user to update their own profile row (incl. avatar_url)
-- =============================================================================
-- Client portal photo saves were failing when users_update_own WITH CHECK rejected
-- the update (RLS). Safe to re-run. App also persists avatars via service role.
-- =============================================================================

DROP POLICY IF EXISTS "users_update_own" ON public.users;

CREATE POLICY "users_update_own"
  ON public.users
  FOR UPDATE
  TO authenticated
  USING (
    id = auth.uid()
    AND deleted_at IS NULL
    AND is_active = TRUE
  )
  WITH CHECK (
    id = auth.uid()
    AND deleted_at IS NULL
    AND is_active = TRUE
    AND role = (SELECT u.role FROM public.users u WHERE u.id = auth.uid())
    AND client_id IS NOT DISTINCT FROM (
      SELECT u.client_id FROM public.users u WHERE u.id = auth.uid()
    )
  );
