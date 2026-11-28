-- =============================================================================
-- 056 — Traffic analytics: shared 360 tour links + landing page visitors
--
-- tour_share_visits: one row per visit to a share link (anonymous visitor ID,
--   30-minute visit window). Link-preview bots are kept as is_preview rows.
--   Unlock (gate) links the visit to tour_share_views.
-- site_visits: one row per website session (30 minutes of inactivity = new).
-- site_events: page views and conversions within a session.
--
-- No raw IPs (salted hash only), no names: viewer details stay in
-- tour_share_views. Written by the service role; read via the app's checks.
-- Apply in Supabase → SQL Editor. Safe to re-run.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.tour_share_visits (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  share_id          UUID NOT NULL REFERENCES public.tour_shares(id) ON DELETE CASCADE,
  tour_id           UUID REFERENCES public.project_tours(id) ON DELETE SET NULL,
  project_id        UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  visitor_id        TEXT NOT NULL,
  is_preview        BOOLEAN NOT NULL DEFAULT FALSE,
  preview_source    TEXT,
  visit_started_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  active_seconds    INTEGER NOT NULL DEFAULT 0 CHECK (active_seconds >= 0),
  unlocked_at       TIMESTAMPTZ,
  view_id           UUID REFERENCES public.tour_share_views(id) ON DELETE SET NULL,
  device            TEXT,
  country           TEXT,
  city              TEXT,
  referrer_host     TEXT,
  ip_hash           TEXT
);
CREATE INDEX IF NOT EXISTS tour_share_visits_share_idx ON public.tour_share_visits (share_id, visit_started_at DESC);
CREATE INDEX IF NOT EXISTS tour_share_visits_project_idx ON public.tour_share_visits (project_id, visit_started_at DESC);
CREATE INDEX IF NOT EXISTS tour_share_visits_visitor_idx ON public.tour_share_visits (share_id, visitor_id, last_seen_at DESC);

CREATE TABLE IF NOT EXISTS public.site_visits (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_id      TEXT NOT NULL,
  is_returning    BOOLEAN NOT NULL DEFAULT FALSE,
  started_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  active_seconds  INTEGER NOT NULL DEFAULT 0 CHECK (active_seconds >= 0),
  entry_path      TEXT NOT NULL,
  exit_path       TEXT,
  page_views      INTEGER NOT NULL DEFAULT 0,
  referrer_host   TEXT,
  source          TEXT,
  utm_source      TEXT,
  utm_medium      TEXT,
  utm_campaign    TEXT,
  device          TEXT,
  country         TEXT,
  city            TEXT,
  ip_hash         TEXT,
  converted       BOOLEAN NOT NULL DEFAULT FALSE
);
CREATE INDEX IF NOT EXISTS site_visits_started_idx ON public.site_visits (started_at DESC);
CREATE INDEX IF NOT EXISTS site_visits_visitor_idx ON public.site_visits (visitor_id, last_seen_at DESC);

CREATE TABLE IF NOT EXISTS public.site_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id        UUID NOT NULL REFERENCES public.site_visits(id) ON DELETE CASCADE,
  kind            TEXT NOT NULL CHECK (kind IN ('page_view', 'conversion', 'click')),
  name            TEXT NOT NULL,
  path            TEXT,
  active_seconds  INTEGER NOT NULL DEFAULT 0 CHECK (active_seconds >= 0),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS site_events_visit_idx ON public.site_events (visit_id, created_at);
CREATE INDEX IF NOT EXISTS site_events_kind_idx ON public.site_events (kind, created_at DESC);

ALTER TABLE public.tour_share_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tour_share_visits_staff_read" ON public.tour_share_visits;
CREATE POLICY "tour_share_visits_staff_read" ON public.tour_share_visits
  FOR SELECT TO authenticated USING (public.is_buildview_staff());
DROP POLICY IF EXISTS "site_visits_staff_read" ON public.site_visits;
CREATE POLICY "site_visits_staff_read" ON public.site_visits
  FOR SELECT TO authenticated USING (public.is_buildview_staff());
DROP POLICY IF EXISTS "site_events_staff_read" ON public.site_events;
CREATE POLICY "site_events_staff_read" ON public.site_events
  FOR SELECT TO authenticated USING (public.is_buildview_staff());

NOTIFY pgrst, 'reload schema';

-- Check: three tables (3 rows).
SELECT table_name FROM information_schema.tables
 WHERE table_schema = 'public' AND table_name IN ('tour_share_visits', 'site_visits', 'site_events');
