-- =============================================================================
-- BuildView — Soft-delete sample seed clients (+ optional all clients)
-- =============================================================================
-- Paste into Supabase SQL Editor when you want a clean slate for testing.
-- Soft-delete only — rows stay in DB but disappear from the app.
-- =============================================================================

-- 1) Soft-delete projects belonging to sample seed clients
UPDATE public.projects
SET deleted_at = NOW()
WHERE deleted_at IS NULL
  AND client_id IN (
    'a0000000-0000-0000-0000-000000000001', -- Meridian Development
    'a0000000-0000-0000-0000-000000000002', -- Apex Construction Group
    'a0000000-0000-0000-0000-000000000003'  -- Design Collective
  );

-- 2) Unlink users from those clients
UPDATE public.users
SET client_id = NULL
WHERE deleted_at IS NULL
  AND client_id IN (
    'a0000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000002',
    'a0000000-0000-0000-0000-000000000003'
  );

-- 3) Soft-delete sample clients
UPDATE public.clients
SET deleted_at = NOW(), is_active = FALSE
WHERE deleted_at IS NULL
  AND id IN (
    'a0000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000002',
    'a0000000-0000-0000-0000-000000000003'
  );

-- -----------------------------------------------------------------------------
-- OPTIONAL: wipe ALL active clients (uncomment to run)
-- -----------------------------------------------------------------------------
-- UPDATE public.projects SET deleted_at = NOW() WHERE deleted_at IS NULL;
-- UPDATE public.users SET client_id = NULL WHERE deleted_at IS NULL AND client_id IS NOT NULL;
-- UPDATE public.clients SET deleted_at = NOW(), is_active = FALSE WHERE deleted_at IS NULL;
