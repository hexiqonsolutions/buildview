-- Suspending a client company (clients.is_active = FALSE) must cut off its users'
-- access to project data, not just change a badge in the admin UI.
--
-- is_active_authenticated_user() gates has_project_access() and every policy built
-- on it (projects, tours, reports, documents, issues, timeline, comments, storage).
-- Client users of a suspended company now fail it. Staff roles and users without a
-- client are unaffected. get_my_client_id() is left alone so suspended users can
-- still read their own company row and invoices.

CREATE OR REPLACE FUNCTION public.is_active_authenticated_user()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users u
    WHERE u.id = auth.uid()
      AND u.is_active = TRUE
      AND u.deleted_at IS NULL
      AND (
        u.client_id IS NULL
        OR u.role IN ('super_admin', 'admin', 'operations_manager')
        OR EXISTS (
          SELECT 1
          FROM public.clients c
          WHERE c.id = u.client_id
            AND c.is_active = TRUE
        )
      )
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_active_authenticated_user() TO authenticated;
