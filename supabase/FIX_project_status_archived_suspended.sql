-- =============================================================================
-- FIX: Add archived + suspended project statuses
-- =============================================================================
-- Run in Supabase SQL Editor if archive/suspend project actions fail with
-- invalid enum value for project_status.
-- =============================================================================

ALTER TYPE project_status ADD VALUE IF NOT EXISTS 'archived';
ALTER TYPE project_status ADD VALUE IF NOT EXISTS 'suspended';
