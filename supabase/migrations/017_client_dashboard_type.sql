-- Client portal experience: construction monitoring vs portfolio showcase

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS dashboard_type TEXT NOT NULL DEFAULT 'construction'
    CHECK (dashboard_type IN ('construction', 'portfolio'));

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS dashboard_type TEXT
    CHECK (dashboard_type IS NULL OR dashboard_type IN ('construction', 'portfolio'));

NOTIFY pgrst, 'reload schema';

COMMENT ON COLUMN public.clients.dashboard_type IS
  'Default client portal: construction (monitoring) or portfolio (showcase walkthroughs).';
COMMENT ON COLUMN public.users.dashboard_type IS
  'Optional per-user portal override; NULL inherits from linked client.';
