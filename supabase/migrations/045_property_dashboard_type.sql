-- =============================================================================
-- 045 — Third client portal: Real Estate Showcase ('property')
--
-- dashboard_type values:
--   construction → Construction Intelligence (unchanged)
--   portfolio    → Interior Showcase (unchanged behaviour, relabelled in app)
--   property     → Real Estate Showcase (property pages, buyer leads)
--
-- Existing rows are untouched. Switch developer clients to 'property' in
-- Admin → Users / Clients after applying.
--
-- Apply in Supabase → SQL Editor. Safe to re-run.
-- =============================================================================

-- Drop whatever CHECK constraints currently guard dashboard_type (names can vary).
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT c.conrelid::regclass AS tbl, c.conname
    FROM pg_constraint c
    WHERE c.contype = 'c'
      AND c.conrelid IN ('public.clients'::regclass, 'public.users'::regclass)
      AND pg_get_constraintdef(c.oid) ILIKE '%dashboard_type%'
  LOOP
    EXECUTE format('ALTER TABLE %s DROP CONSTRAINT %I', r.tbl, r.conname);
  END LOOP;
END $$;

ALTER TABLE public.clients
  DROP CONSTRAINT IF EXISTS clients_dashboard_type_check;
ALTER TABLE public.clients
  ADD CONSTRAINT clients_dashboard_type_check
  CHECK (dashboard_type IN ('construction', 'portfolio', 'property'));

ALTER TABLE public.users
  DROP CONSTRAINT IF EXISTS users_dashboard_type_check;
ALTER TABLE public.users
  ADD CONSTRAINT users_dashboard_type_check
  CHECK (dashboard_type IS NULL OR dashboard_type IN ('construction', 'portfolio', 'property'));

COMMENT ON COLUMN public.clients.dashboard_type IS
  'Client portal: construction (Construction Intelligence), portfolio (Interior Showcase), property (Real Estate Showcase).';
COMMENT ON COLUMN public.users.dashboard_type IS
  'Optional per-user portal override; NULL inherits from linked client.';

NOTIFY pgrst, 'reload schema';
