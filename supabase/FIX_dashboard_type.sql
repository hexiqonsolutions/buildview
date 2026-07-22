-- =============================================================================
-- REQUIRED: Run this once in Supabase → SQL Editor → New query → Run
-- Fixes: "Could not find the 'dashboard_type' column ... in the schema cache"
-- =============================================================================

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS dashboard_type TEXT NOT NULL DEFAULT 'construction'
    CHECK (dashboard_type IN ('construction', 'portfolio'));

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS dashboard_type TEXT
    CHECK (dashboard_type IS NULL OR dashboard_type IN ('construction', 'portfolio'));

-- Refresh PostgREST schema cache (optional; Dashboard restart also works)
NOTIFY pgrst, 'reload schema';

COMMENT ON COLUMN public.clients.dashboard_type IS
  'Default client portal: construction (monitoring) or portfolio (showcase walkthroughs).';
COMMENT ON COLUMN public.users.dashboard_type IS
  'Optional per-user portal override; NULL inherits from linked client.';

-- Verify (should return construction / portfolio after you assign):
-- SELECT id, company_name, dashboard_type FROM public.clients;
-- SELECT id, email, dashboard_type FROM public.users WHERE client_id IS NOT NULL;
