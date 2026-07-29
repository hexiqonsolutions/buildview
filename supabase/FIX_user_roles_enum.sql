-- STEP 1: Run ONLY this block in Supabase SQL Editor, then click Run.
-- Do NOT include the SELECT in the same run (PostgreSQL error 55P04).

ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'admin';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'operations_manager';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'site_engineer';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'client_admin';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'client_user';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'read_only_client';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'consultant';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'site_supervisor';

-- STEP 2: Open a NEW query tab and run this separately to verify:
-- SELECT unnest(enum_range(NULL::user_role)) AS available_roles ORDER BY 1;
