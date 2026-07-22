-- =============================================================================
-- BuildView Phase 1: Extended user roles + staff access helper
-- =============================================================================

ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'admin';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'operations_manager';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'site_engineer';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'client_admin';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'client_user';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'read_only_client';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'consultant';

-- Internal BuildView team (operations control center)
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
      AND role IN (
        'super_admin',
        'admin',
        'operations_manager',
        'site_engineer'
      )
  );
$$;

-- Preserve existing RLS policies: staff roles get the same data access as super_admin
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_buildview_staff();
$$;

GRANT EXECUTE ON FUNCTION public.is_buildview_staff() TO authenticated;

COMMENT ON FUNCTION public.is_buildview_staff() IS
  'True when the authenticated user is active BuildView internal staff.';
