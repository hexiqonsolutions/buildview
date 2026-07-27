-- =============================================================================
-- Add site_supervisor client portal role
-- =============================================================================

ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'site_supervisor';
