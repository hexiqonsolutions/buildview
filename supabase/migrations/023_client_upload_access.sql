-- Allow Client Admin and Site Supervisor uploads to assigned/org projects.

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
      AND role::text IN ('client_admin', 'site_supervisor')
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

  IF user_role_text = 'site_supervisor' THEN
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

GRANT EXECUTE ON FUNCTION public.is_client_upload_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_client_upload_to_project(UUID) TO authenticated;

-- Storage: client upload roles can write project files they manage.
CREATE POLICY "storage_reports_client_upload"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'reports'
    AND public.can_client_upload_to_project(public.storage_project_id(name))
  );

CREATE POLICY "storage_documents_client_upload"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'documents'
    AND public.can_client_upload_to_project(public.storage_project_id(name))
  );

CREATE POLICY "storage_timeline_photos_client_upload"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'timeline-photos'
    AND public.can_client_upload_to_project(public.storage_project_id(name))
  );

-- Tables: allow client upload roles to create content rows on their projects.
CREATE POLICY "reports_client_insert"
  ON public.reports
  FOR INSERT
  TO authenticated
  WITH CHECK (public.can_client_upload_to_project(project_id));

CREATE POLICY "documents_client_insert"
  ON public.documents
  FOR INSERT
  TO authenticated
  WITH CHECK (public.can_client_upload_to_project(project_id));

CREATE POLICY "timeline_events_client_insert"
  ON public.timeline_events
  FOR INSERT
  TO authenticated
  WITH CHECK (public.can_client_upload_to_project(project_id));

CREATE POLICY "tours_client_insert"
  ON public.project_tours
  FOR INSERT
  TO authenticated
  WITH CHECK (public.can_client_upload_to_project(project_id));

CREATE POLICY "timeline_photos_client_insert"
  ON public.timeline_photos
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.timeline_events te
      WHERE te.id = timeline_event_id
        AND te.deleted_at IS NULL
        AND public.can_client_upload_to_project(te.project_id)
    )
  );
