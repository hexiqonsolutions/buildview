-- ============================================================================
-- BuildView — migration 041: public tour share links + viewer tracking
-- ============================================================================
-- Shareable Matterport scan pages at /share/tours/[token] (no login).
-- Links expire after 10 days and can be revoked early. Viewer name/email
-- are collected on open.
--
-- Apply in Supabase → SQL Editor. Safe to re-run.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.tour_shares (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tour_id UUID NOT NULL REFERENCES public.project_tours(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT tour_shares_token_unique UNIQUE (token),
  CONSTRAINT tour_shares_token_len CHECK (char_length(token) >= 24)
);

CREATE INDEX IF NOT EXISTS idx_tour_shares_tour_active
  ON public.tour_shares (tour_id, created_at DESC)
  WHERE revoked_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_tour_shares_project
  ON public.tour_shares (project_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_tour_shares_token
  ON public.tour_shares (token)
  WHERE revoked_at IS NULL;

CREATE TABLE IF NOT EXISTS public.tour_share_views (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  share_id UUID NOT NULL REFERENCES public.tour_shares(id) ON DELETE CASCADE,
  viewer_name TEXT NOT NULL,
  viewer_email TEXT,
  user_agent TEXT,
  ip_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT tour_share_views_name_len CHECK (char_length(btrim(viewer_name)) >= 1)
);

CREATE INDEX IF NOT EXISTS idx_tour_share_views_share_created
  ON public.tour_share_views (share_id, created_at DESC);

ALTER TABLE public.tour_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tour_share_views ENABLE ROW LEVEL SECURITY;

-- Authenticated: staff or project members can read shares for their projects
DROP POLICY IF EXISTS "tour_shares_select_access" ON public.tour_shares;
CREATE POLICY "tour_shares_select_access"
  ON public.tour_shares
  FOR SELECT TO authenticated
  USING (
    public.is_buildview_staff()
    OR public.has_project_access(project_id)
  );

DROP POLICY IF EXISTS "tour_shares_insert_access" ON public.tour_shares;
CREATE POLICY "tour_shares_insert_access"
  ON public.tour_shares
  FOR INSERT TO authenticated
  WITH CHECK (
    (public.is_buildview_staff() OR public.has_project_access(project_id))
    AND created_by = auth.uid()
  );

DROP POLICY IF EXISTS "tour_shares_update_access" ON public.tour_shares;
CREATE POLICY "tour_shares_update_access"
  ON public.tour_shares
  FOR UPDATE TO authenticated
  USING (
    public.is_buildview_staff()
    OR public.has_project_access(project_id)
  )
  WITH CHECK (
    public.is_buildview_staff()
    OR public.has_project_access(project_id)
  );

-- Views: authenticated can read; inserts go through service role only
DROP POLICY IF EXISTS "tour_share_views_select_access" ON public.tour_share_views;
CREATE POLICY "tour_share_views_select_access"
  ON public.tour_share_views
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.tour_shares s
      WHERE s.id = share_id
        AND (
          public.is_buildview_staff()
          OR public.has_project_access(s.project_id)
        )
    )
  );

COMMENT ON TABLE public.tour_shares IS
  'Public no-login Matterport share links; expire after 10 days or on revoke.';
COMMENT ON TABLE public.tour_share_views IS
  'People who opened a shared tour link (name required, email optional).';
