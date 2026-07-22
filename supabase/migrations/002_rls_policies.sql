-- =============================================================================
-- BuildView — Phase 2: Row Level Security Policies
-- =============================================================================
-- Run after: 001_initial_schema.sql
-- Requires: authenticated Supabase Auth users
-- =============================================================================

-- =============================================================================
-- Enable RLS on all tables
-- =============================================================================

ALTER TABLE public.clients             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_tours       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_folders    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.issues              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.issue_images        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timeline_events     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timeline_photos     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs       ENABLE ROW LEVEL SECURITY;

-- Force RLS even for table owner (defence in depth)
ALTER TABLE public.clients             FORCE ROW LEVEL SECURITY;
ALTER TABLE public.users               FORCE ROW LEVEL SECURITY;
ALTER TABLE public.projects            FORCE ROW LEVEL SECURITY;
ALTER TABLE public.project_assignments FORCE ROW LEVEL SECURITY;
ALTER TABLE public.project_tours       FORCE ROW LEVEL SECURITY;
ALTER TABLE public.reports             FORCE ROW LEVEL SECURITY;
ALTER TABLE public.document_folders    FORCE ROW LEVEL SECURITY;
ALTER TABLE public.documents           FORCE ROW LEVEL SECURITY;
ALTER TABLE public.issues              FORCE ROW LEVEL SECURITY;
ALTER TABLE public.issue_images        FORCE ROW LEVEL SECURITY;
ALTER TABLE public.timeline_events     FORCE ROW LEVEL SECURITY;
ALTER TABLE public.timeline_photos     FORCE ROW LEVEL SECURITY;
ALTER TABLE public.invoices            FORCE ROW LEVEL SECURITY;
ALTER TABLE public.notifications       FORCE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs       FORCE ROW LEVEL SECURITY;

-- =============================================================================
-- Helper functions (SECURITY DEFINER — bypass RLS for role checks)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.current_user_profile()
RETURNS public.users
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT *
  FROM public.users
  WHERE id = auth.uid()
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users
    WHERE id = auth.uid()
      AND role = 'super_admin'
      AND is_active = TRUE
      AND deleted_at IS NULL
  );
$$;

CREATE OR REPLACE FUNCTION public.is_active_authenticated_user()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users
    WHERE id = auth.uid()
      AND is_active = TRUE
      AND deleted_at IS NULL
  );
$$;

CREATE OR REPLACE FUNCTION public.get_my_client_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT client_id
  FROM public.users
  WHERE id = auth.uid()
    AND is_active = TRUE
    AND deleted_at IS NULL
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.has_project_access(project_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN FALSE;
  END IF;

  IF public.is_super_admin() THEN
    RETURN TRUE;
  END IF;

  IF NOT public.is_active_authenticated_user() THEN
    RETURN FALSE;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM public.project_assignments pa
    INNER JOIN public.projects p ON p.id = pa.project_id
    WHERE pa.project_id = project_uuid
      AND pa.user_id = auth.uid()
      AND pa.deleted_at IS NULL
      AND p.deleted_at IS NULL
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.has_issue_access(issue_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_project_access(i.project_id)
  FROM public.issues i
  WHERE i.id = issue_uuid
    AND i.deleted_at IS NULL;
$$;

CREATE OR REPLACE FUNCTION public.has_timeline_event_access(event_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_project_access(te.project_id)
  FROM public.timeline_events te
  WHERE te.id = event_uuid
    AND te.deleted_at IS NULL;
$$;

CREATE OR REPLACE FUNCTION public.has_folder_access(folder_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_project_access(df.project_id)
  FROM public.document_folders df
  WHERE df.id = folder_uuid
    AND df.deleted_at IS NULL;
$$;

-- Grant execute on helper functions to authenticated users
GRANT EXECUTE ON FUNCTION public.current_user_profile() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_active_authenticated_user() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_client_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_project_access(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_issue_access(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_timeline_event_access(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_folder_access(UUID) TO authenticated;

-- =============================================================================
-- 1. clients
-- =============================================================================

CREATE POLICY "clients_super_admin_all"
  ON public.clients
  FOR ALL
  TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

CREATE POLICY "clients_select_own"
  ON public.clients
  FOR SELECT
  TO authenticated
  USING (
    id = public.get_my_client_id()
    AND deleted_at IS NULL
  );

-- =============================================================================
-- 2. users
-- =============================================================================

CREATE POLICY "users_super_admin_all"
  ON public.users
  FOR ALL
  TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

CREATE POLICY "users_select_own"
  ON public.users
  FOR SELECT
  TO authenticated
  USING (
    id = auth.uid()
    AND deleted_at IS NULL
  );

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

-- =============================================================================
-- 3. projects
-- =============================================================================

CREATE POLICY "projects_super_admin_all"
  ON public.projects
  FOR ALL
  TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

CREATE POLICY "projects_client_select"
  ON public.projects
  FOR SELECT
  TO authenticated
  USING (
    public.has_project_access(id)
    AND deleted_at IS NULL
  );

-- =============================================================================
-- 4. project_assignments
-- =============================================================================

CREATE POLICY "assignments_super_admin_all"
  ON public.project_assignments
  FOR ALL
  TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

CREATE POLICY "assignments_client_select_own"
  ON public.project_assignments
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    AND deleted_at IS NULL
    AND public.has_project_access(project_id)
  );

-- =============================================================================
-- 5. project_tours
-- =============================================================================

CREATE POLICY "tours_super_admin_all"
  ON public.project_tours
  FOR ALL
  TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

CREATE POLICY "tours_client_select"
  ON public.project_tours
  FOR SELECT
  TO authenticated
  USING (
    public.has_project_access(project_id)
    AND deleted_at IS NULL
  );

-- =============================================================================
-- 6. reports
-- =============================================================================

CREATE POLICY "reports_super_admin_all"
  ON public.reports
  FOR ALL
  TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

CREATE POLICY "reports_client_select"
  ON public.reports
  FOR SELECT
  TO authenticated
  USING (
    public.has_project_access(project_id)
    AND deleted_at IS NULL
  );

-- =============================================================================
-- 7. document_folders
-- =============================================================================

CREATE POLICY "folders_super_admin_all"
  ON public.document_folders
  FOR ALL
  TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

CREATE POLICY "folders_client_select"
  ON public.document_folders
  FOR SELECT
  TO authenticated
  USING (
    public.has_project_access(project_id)
    AND deleted_at IS NULL
  );

-- =============================================================================
-- 8. documents
-- =============================================================================

CREATE POLICY "documents_super_admin_all"
  ON public.documents
  FOR ALL
  TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

CREATE POLICY "documents_client_select"
  ON public.documents
  FOR SELECT
  TO authenticated
  USING (
    public.has_project_access(project_id)
    AND deleted_at IS NULL
  );

-- =============================================================================
-- 9. issues
-- =============================================================================

CREATE POLICY "issues_super_admin_all"
  ON public.issues
  FOR ALL
  TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

CREATE POLICY "issues_client_select"
  ON public.issues
  FOR SELECT
  TO authenticated
  USING (
    public.has_project_access(project_id)
    AND deleted_at IS NULL
  );

CREATE POLICY "issues_client_insert"
  ON public.issues
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_project_access(project_id)
    AND created_by = auth.uid()
  );

CREATE POLICY "issues_client_update"
  ON public.issues
  FOR UPDATE
  TO authenticated
  USING (
    public.has_project_access(project_id)
    AND deleted_at IS NULL
  )
  WITH CHECK (
    public.has_project_access(project_id)
    AND deleted_at IS NULL
  );

-- =============================================================================
-- 10. issue_images
-- =============================================================================

CREATE POLICY "issue_images_super_admin_all"
  ON public.issue_images
  FOR ALL
  TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

CREATE POLICY "issue_images_client_select"
  ON public.issue_images
  FOR SELECT
  TO authenticated
  USING (
    public.has_issue_access(issue_id)
    AND deleted_at IS NULL
  );

CREATE POLICY "issue_images_client_insert"
  ON public.issue_images
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_issue_access(issue_id)
    AND created_by = auth.uid()
  );

-- =============================================================================
-- 11. timeline_events
-- =============================================================================

CREATE POLICY "timeline_events_super_admin_all"
  ON public.timeline_events
  FOR ALL
  TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

CREATE POLICY "timeline_events_client_select"
  ON public.timeline_events
  FOR SELECT
  TO authenticated
  USING (
    public.has_project_access(project_id)
    AND deleted_at IS NULL
  );

-- =============================================================================
-- 12. timeline_photos
-- =============================================================================

CREATE POLICY "timeline_photos_super_admin_all"
  ON public.timeline_photos
  FOR ALL
  TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

CREATE POLICY "timeline_photos_client_select"
  ON public.timeline_photos
  FOR SELECT
  TO authenticated
  USING (
    public.has_timeline_event_access(timeline_event_id)
    AND deleted_at IS NULL
  );

-- =============================================================================
-- 13. invoices
-- =============================================================================

CREATE POLICY "invoices_super_admin_all"
  ON public.invoices
  FOR ALL
  TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

CREATE POLICY "invoices_client_select"
  ON public.invoices
  FOR SELECT
  TO authenticated
  USING (
    client_id = public.get_my_client_id()
    AND deleted_at IS NULL
  );

-- =============================================================================
-- 14. notifications
-- =============================================================================

CREATE POLICY "notifications_super_admin_all"
  ON public.notifications
  FOR ALL
  TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

CREATE POLICY "notifications_user_select"
  ON public.notifications
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    AND deleted_at IS NULL
  );

CREATE POLICY "notifications_user_update"
  ON public.notifications
  FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid()
    AND deleted_at IS NULL
  )
  WITH CHECK (
    user_id = auth.uid()
  );

-- =============================================================================
-- 15. activity_logs (append-only for clients)
-- =============================================================================

CREATE POLICY "activity_logs_super_admin_select"
  ON public.activity_logs
  FOR SELECT
  TO authenticated
  USING (public.is_super_admin());

CREATE POLICY "activity_logs_user_select_own"
  ON public.activity_logs
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "activity_logs_super_admin_insert"
  ON public.activity_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_super_admin());

CREATE POLICY "activity_logs_user_insert_own"
  ON public.activity_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND public.is_active_authenticated_user()
  );

-- =============================================================================
-- Table-level grants (RLS still applies)
-- =============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT ON public.active_projects TO authenticated;
GRANT SELECT ON public.active_issues TO authenticated;

-- Revoke anonymous access to application tables
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
