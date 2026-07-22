-- =============================================================================
-- BuildView — Migration 005: Fix users self-update RLS for NULL client_id
-- =============================================================================
-- The original users_update_own policy used `client_id = (SELECT ...)`, which
-- fails when client_id is NULL (NULL = NULL is unknown in SQL, not TRUE).
-- This blocked profile updates for super admins and unlinked client users.
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
    AND role = (SELECT role FROM public.users WHERE id = auth.uid())
    AND client_id IS NOT DISTINCT FROM (
      SELECT client_id FROM public.users WHERE id = auth.uid()
    )
  );
