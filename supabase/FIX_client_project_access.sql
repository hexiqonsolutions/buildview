-- Fix: client portal users only saw projects they were manually added to in Team.
-- Creating a project under a client did NOT grant access. This updates RLS and
-- backfills missing project_assignments for existing data.
--
-- Run in Supabase SQL Editor, then hard-refresh the client portal.

-- 1) Org members can access any project belonging to their client company
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

  -- Explicit team assignment
  IF EXISTS (
    SELECT 1
    FROM public.project_assignments pa
    INNER JOIN public.projects p ON p.id = pa.project_id
    WHERE pa.project_id = project_uuid
      AND pa.user_id = auth.uid()
      AND pa.deleted_at IS NULL
      AND p.deleted_at IS NULL
  ) THEN
    RETURN TRUE;
  END IF;

  -- Client org membership: any project under the user's client_id
  RETURN EXISTS (
    SELECT 1
    FROM public.projects p
    INNER JOIN public.users u ON u.id = auth.uid()
    WHERE p.id = project_uuid
      AND p.deleted_at IS NULL
      AND u.deleted_at IS NULL
      AND u.is_active = TRUE
      AND u.client_id IS NOT NULL
      AND p.client_id = u.client_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.has_project_access(UUID) TO authenticated;

-- 2) Backfill: assign every active client user to each of that client's projects
INSERT INTO public.project_assignments (
  project_id,
  user_id,
  assigned_by,
  created_by
)
SELECT
  p.id,
  u.id,
  NULL,
  NULL
FROM public.projects p
INNER JOIN public.users u
  ON u.client_id = p.client_id
WHERE p.deleted_at IS NULL
  AND u.deleted_at IS NULL
  AND u.is_active = TRUE
  AND u.client_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM public.project_assignments pa
    WHERE pa.project_id = p.id
      AND pa.user_id = u.id
  );

-- Soft-deleted assignments: restore them for org members
UPDATE public.project_assignments pa
SET
  deleted_at = NULL,
  deleted_by = NULL
FROM public.projects p
INNER JOIN public.users u ON u.client_id = p.client_id
WHERE pa.project_id = p.id
  AND pa.user_id = u.id
  AND pa.deleted_at IS NOT NULL
  AND p.deleted_at IS NULL
  AND u.deleted_at IS NULL
  AND u.is_active = TRUE;

-- Quick check (optional): how many assignments per user
-- SELECT u.email, COUNT(pa.id) AS projects
-- FROM public.users u
-- LEFT JOIN public.project_assignments pa
--   ON pa.user_id = u.id AND pa.deleted_at IS NULL
-- WHERE u.client_id IS NOT NULL AND u.deleted_at IS NULL
-- GROUP BY u.email
-- ORDER BY projects DESC;
