-- =============================================================================
-- 026 — Issue tracking hardening
--
-- 1. site_engineer is a client-portal role in the app (project-scoped), but 007
--    listed it in is_buildview_staff(), which granted platform-wide access via
--    every *_super_admin_all policy. Remove it and give it the same upload
--    rights as site_supervisor instead.
-- 2. Only Client Admin / Site Supervisor / Site Engineer may update issues from
--    the client side, and only the status fields. Other columns stay staff-only.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.is_buildview_staff()
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
      AND is_active = true
      AND deleted_at IS NULL
      AND role::text IN ('super_admin', 'admin', 'operations_manager')
  );
$$;

CREATE OR REPLACE FUNCTION public.is_client_upload_role()
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
      AND is_active = true
      AND deleted_at IS NULL
      AND role::text IN ('client_admin', 'site_supervisor', 'site_engineer')
  );
$$;

CREATE OR REPLACE FUNCTION public.can_client_upload_to_project(project_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role_text TEXT;
  user_client_id UUID;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_active_authenticated_user() THEN
    RETURN FALSE;
  END IF;

  IF public.is_buildview_staff() THEN
    RETURN TRUE;
  END IF;

  SELECT role::text, client_id
  INTO user_role_text, user_client_id
  FROM public.users
  WHERE id = auth.uid()
    AND is_active = true
    AND deleted_at IS NULL;

  IF user_role_text IS NULL THEN
    RETURN FALSE;
  END IF;

  IF user_role_text = 'client_admin' AND user_client_id IS NOT NULL THEN
    RETURN EXISTS (
      SELECT 1
      FROM public.projects p
      WHERE p.id = project_uuid
        AND p.client_id = user_client_id
        AND p.deleted_at IS NULL
    );
  END IF;

  IF user_role_text IN ('site_supervisor', 'site_engineer') THEN
    RETURN EXISTS (
      SELECT 1
      FROM public.project_assignments pa
      INNER JOIN public.projects p ON p.id = pa.project_id
      WHERE pa.project_id = project_uuid
        AND pa.user_id = auth.uid()
        AND pa.deleted_at IS NULL
        AND p.deleted_at IS NULL
    );
  END IF;

  RETURN FALSE;
END;
$$;

CREATE OR REPLACE FUNCTION public.can_update_issue_status()
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
      AND is_active = true
      AND deleted_at IS NULL
      AND role::text IN ('client_admin', 'site_supervisor', 'site_engineer')
  );
$$;

GRANT EXECUTE ON FUNCTION public.can_update_issue_status() TO authenticated;

DROP POLICY IF EXISTS "issues_client_update" ON public.issues;

CREATE POLICY "issues_client_update"
  ON public.issues
  FOR UPDATE
  TO authenticated
  USING (
    public.has_project_access(project_id)
    AND public.can_update_issue_status()
    AND deleted_at IS NULL
  )
  WITH CHECK (
    public.has_project_access(project_id)
    AND public.can_update_issue_status()
    AND deleted_at IS NULL
  );

-- RLS cannot restrict columns, so a trigger keeps client-side updates to the
-- status workflow. Service-role calls (auth.uid() IS NULL) and staff bypass it.
CREATE OR REPLACE FUNCTION public.enforce_issue_client_update_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR public.is_buildview_staff() THEN
    RETURN NEW;
  END IF;

  IF NEW.project_id  IS DISTINCT FROM OLD.project_id
     OR NEW.title       IS DISTINCT FROM OLD.title
     OR NEW.description IS DISTINCT FROM OLD.description
     OR NEW.priority    IS DISTINCT FROM OLD.priority
     OR NEW.location    IS DISTINCT FROM OLD.location
     OR NEW.assigned_to IS DISTINCT FROM OLD.assigned_to
     OR NEW.due_date    IS DISTINCT FROM OLD.due_date
     OR NEW.deleted_at  IS DISTINCT FROM OLD.deleted_at
     OR NEW.created_by  IS DISTINCT FROM OLD.created_by
  THEN
    RAISE EXCEPTION 'Only BuildView staff can edit issue details. Client roles may only change status.'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_issues_enforce_client_columns ON public.issues;

CREATE TRIGGER trg_issues_enforce_client_columns
  BEFORE UPDATE ON public.issues
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_issue_client_update_columns();
