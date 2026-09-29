-- =============================================================================
-- BuildView — repair bundle for migrations 008–015 + 021
-- =============================================================================
-- Production is missing these migrations, so tour uploads fail with
-- "column project_tours.building_id does not exist".
--
-- Run once in Supabase Dashboard → SQL Editor. Safe to re-run: every statement
-- is guarded, and the whole script is one transaction (all-or-nothing).
-- Verify afterwards with: npm run db:check
-- =============================================================================

BEGIN;

-- ========== 008_buildings_floors.sql ==========

CREATE TABLE IF NOT EXISTS public.buildings (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id  UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at  TIMESTAMPTZ,
  CONSTRAINT buildings_project_name_unique UNIQUE (project_id, name)
);

CREATE TABLE IF NOT EXISTS public.floors (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  building_id UUID NOT NULL REFERENCES public.buildings(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at  TIMESTAMPTZ,
  CONSTRAINT floors_building_name_unique UNIQUE (building_id, name)
);

CREATE INDEX IF NOT EXISTS buildings_project_id_idx ON public.buildings(project_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS floors_building_id_idx ON public.floors(building_id) WHERE deleted_at IS NULL;

COMMENT ON TABLE public.buildings IS 'Physical buildings within a construction project.';
COMMENT ON TABLE public.floors IS 'Floors within a building for workspace scoping.';

ALTER TABLE public.buildings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.floors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buildings FORCE ROW LEVEL SECURITY;
ALTER TABLE public.floors FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "buildings_client_read" ON public.buildings;
CREATE POLICY "buildings_client_read"
  ON public.buildings FOR SELECT
  TO authenticated
  USING (public.has_project_access(project_id));

DROP POLICY IF EXISTS "floors_client_read" ON public.floors;
CREATE POLICY "floors_client_read"
  ON public.floors FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.buildings b
      WHERE b.id = floors.building_id
        AND b.deleted_at IS NULL
        AND public.has_project_access(b.project_id)
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.buildings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.floors TO authenticated;

-- ========== 009_platform_settings.sql ==========

CREATE TABLE IF NOT EXISTS public.platform_settings (
  id TEXT PRIMARY KEY DEFAULT 'default' CHECK (id = 'default'),
  company_name TEXT NOT NULL DEFAULT 'BuildView',
  support_email TEXT NOT NULL DEFAULT 'ops@buildview.com',
  default_currency TEXT NOT NULL DEFAULT 'USD',
  timezone TEXT NOT NULL DEFAULT 'Asia/Kolkata',
  notification_rules JSONB NOT NULL DEFAULT '{"onUpload":true,"onCriticalIssue":true,"onInvoiceSent":true}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES public.users(id) ON DELETE SET NULL
);

INSERT INTO public.platform_settings (id)
VALUES ('default')
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "platform_settings_authenticated_read" ON public.platform_settings;
CREATE POLICY "platform_settings_authenticated_read"
  ON public.platform_settings
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "platform_settings_staff_write" ON public.platform_settings;
CREATE POLICY "platform_settings_staff_write"
  ON public.platform_settings
  FOR ALL
  TO authenticated
  USING (public.is_buildview_staff())
  WITH CHECK (public.is_buildview_staff());

DROP POLICY IF EXISTS "notifications_staff_insert" ON public.notifications;
CREATE POLICY "notifications_staff_insert"
  ON public.notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_buildview_staff());

COMMENT ON TABLE public.platform_settings IS 'Singleton platform configuration for BuildView ops + client portal.';

-- ========== 010_buildings_staff_rls.sql ==========

DROP POLICY IF EXISTS "buildings_staff_all" ON public.buildings;
DROP POLICY IF EXISTS "floors_staff_all" ON public.floors;

CREATE POLICY "buildings_staff_all"
  ON public.buildings FOR ALL
  TO authenticated
  USING (public.is_buildview_staff())
  WITH CHECK (public.is_buildview_staff());

CREATE POLICY "floors_staff_all"
  ON public.floors FOR ALL
  TO authenticated
  USING (public.is_buildview_staff())
  WITH CHECK (public.is_buildview_staff());

-- ========== 011_content_spatial_scope.sql ==========

ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS building TEXT,
  ADD COLUMN IF NOT EXISTS floor TEXT;

ALTER TABLE public.timeline_events
  ADD COLUMN IF NOT EXISTS building TEXT,
  ADD COLUMN IF NOT EXISTS floor TEXT;

ALTER TABLE public.issues
  ADD COLUMN IF NOT EXISTS building TEXT,
  ADD COLUMN IF NOT EXISTS floor TEXT;

ALTER TABLE public.reports
  ADD COLUMN IF NOT EXISTS building TEXT,
  ADD COLUMN IF NOT EXISTS floor TEXT;

CREATE INDEX IF NOT EXISTS idx_documents_spatial
  ON public.documents(project_id, building, floor) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_timeline_events_spatial
  ON public.timeline_events(project_id, building, floor) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_issues_spatial
  ON public.issues(project_id, building, floor) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_reports_spatial
  ON public.reports(project_id, building, floor) WHERE deleted_at IS NULL;

-- ========== 012_document_versions.sql ==========

ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS document_group_id UUID,
  ADD COLUMN IF NOT EXISTS version_number INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS is_current BOOLEAN NOT NULL DEFAULT true;

UPDATE public.documents
SET document_group_id = id
WHERE document_group_id IS NULL;

ALTER TABLE public.documents
  ALTER COLUMN document_group_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_documents_group_current
  ON public.documents(document_group_id, is_current)
  WHERE deleted_at IS NULL AND is_current = true;

CREATE UNIQUE INDEX IF NOT EXISTS idx_documents_group_version
  ON public.documents(document_group_id, version_number)
  WHERE deleted_at IS NULL;

-- ========== 013_spatial_fk_columns.sql ==========

ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS building_id UUID REFERENCES public.buildings(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS floor_id UUID REFERENCES public.floors(id) ON DELETE SET NULL;

ALTER TABLE public.timeline_events
  ADD COLUMN IF NOT EXISTS building_id UUID REFERENCES public.buildings(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS floor_id UUID REFERENCES public.floors(id) ON DELETE SET NULL;

ALTER TABLE public.issues
  ADD COLUMN IF NOT EXISTS building_id UUID REFERENCES public.buildings(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS floor_id UUID REFERENCES public.floors(id) ON DELETE SET NULL;

ALTER TABLE public.reports
  ADD COLUMN IF NOT EXISTS building_id UUID REFERENCES public.buildings(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS floor_id UUID REFERENCES public.floors(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_documents_spatial_fk
  ON public.documents(project_id, building_id, floor_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_timeline_events_spatial_fk
  ON public.timeline_events(project_id, building_id, floor_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_issues_spatial_fk
  ON public.issues(project_id, building_id, floor_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_reports_spatial_fk
  ON public.reports(project_id, building_id, floor_id) WHERE deleted_at IS NULL;

-- ========== 014_tour_spatial_fk.sql ==========

ALTER TABLE public.project_tours
  ADD COLUMN IF NOT EXISTS building_id UUID REFERENCES public.buildings(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS floor_id UUID REFERENCES public.floors(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_project_tours_spatial_fk
  ON public.project_tours(project_id, building_id, floor_id) WHERE deleted_at IS NULL;

-- ========== 015_saved_comparisons.sql ==========

CREATE TABLE IF NOT EXISTS public.saved_comparisons (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  project_id   UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  tour_a_id    UUID NOT NULL REFERENCES public.project_tours(id) ON DELETE CASCADE,
  tour_b_id    UUID NOT NULL REFERENCES public.project_tours(id) ON DELETE CASCADE,
  building     TEXT NOT NULL DEFAULT 'all',
  floor        TEXT NOT NULL DEFAULT 'all',
  building_id  UUID REFERENCES public.buildings(id) ON DELETE SET NULL,
  floor_id     UUID REFERENCES public.floors(id) ON DELETE SET NULL,
  client_id    UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at   TIMESTAMPTZ,
  CONSTRAINT saved_comparisons_distinct_tours CHECK (tour_a_id <> tour_b_id)
);

CREATE INDEX IF NOT EXISTS saved_comparisons_user_idx
  ON public.saved_comparisons (user_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS saved_comparisons_project_idx
  ON public.saved_comparisons (project_id)
  WHERE deleted_at IS NULL;

ALTER TABLE public.saved_comparisons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_comparisons FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "saved_comparisons_staff_all" ON public.saved_comparisons;
CREATE POLICY "saved_comparisons_staff_all"
  ON public.saved_comparisons
  FOR ALL
  TO authenticated
  USING (public.is_buildview_staff())
  WITH CHECK (public.is_buildview_staff());

DROP POLICY IF EXISTS "saved_comparisons_user_own" ON public.saved_comparisons;
CREATE POLICY "saved_comparisons_user_own"
  ON public.saved_comparisons
  FOR ALL
  TO authenticated
  USING (
    user_id = auth.uid()
    AND deleted_at IS NULL
    AND public.has_project_access(project_id)
  )
  WITH CHECK (
    user_id = auth.uid()
    AND public.has_project_access(project_id)
  );

COMMENT ON TABLE public.saved_comparisons IS
  'User-saved Matterport scan comparison presets (project, tours, spatial scope).';

-- ========== 021_inr_default_currency.sql ==========

ALTER TABLE public.platform_settings
  ALTER COLUMN default_currency SET DEFAULT 'INR';

UPDATE public.platform_settings
SET default_currency = 'INR'
WHERE id = 'default' AND default_currency = 'USD';

ALTER TABLE public.invoices
  ALTER COLUMN currency SET DEFAULT 'INR';

COMMIT;

NOTIFY pgrst, 'reload schema';
