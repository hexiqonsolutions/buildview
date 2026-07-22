-- =============================================================================
-- BuildView — Pending migrations bundle (004 + 008–015)
-- =============================================================================
-- Run in Supabase SQL Editor if npm run db:apply is unavailable.
-- Regenerate: npm run db:bundle
-- =============================================================================

-- ========== 004_project_comments.sql ==========

-- =============================================================================
-- BuildView — Migration 004: Project Comments
-- =============================================================================
-- Lets clients leave feedback / change requests on a project, and lets the
-- BuildView team reply and mark items resolved. Run after 001, 002, 003.
-- =============================================================================

CREATE TYPE comment_status AS ENUM ('open', 'resolved');

CREATE TABLE public.project_comments (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id    UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  message       TEXT NOT NULL,
  status        comment_status NOT NULL DEFAULT 'open',
  created_by    UUID REFERENCES public.users(id) ON DELETE SET NULL,
  updated_by    UUID REFERENCES public.users(id) ON DELETE SET NULL,
  deleted_by    UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at    TIMESTAMPTZ,
  CONSTRAINT project_comments_message_not_blank CHECK (length(trim(message)) > 0)
);

COMMENT ON TABLE public.project_comments IS 'Client feedback / change requests and admin replies on a project.';

CREATE INDEX idx_project_comments_project_id ON public.project_comments(project_id);
CREATE INDEX idx_project_comments_status ON public.project_comments(status);
CREATE INDEX idx_project_comments_active ON public.project_comments(project_id) WHERE deleted_at IS NULL;

CREATE TRIGGER trg_project_comments_updated_at
  BEFORE UPDATE ON public.project_comments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_project_comments_soft_delete
  BEFORE UPDATE ON public.project_comments
  FOR EACH ROW EXECUTE FUNCTION public.set_soft_delete_audit();

-- =============================================================================
-- Row Level Security
-- =============================================================================

ALTER TABLE public.project_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_comments FORCE ROW LEVEL SECURITY;

CREATE POLICY "project_comments_super_admin_all"
  ON public.project_comments
  FOR ALL
  TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

CREATE POLICY "project_comments_client_select"
  ON public.project_comments
  FOR SELECT
  TO authenticated
  USING (
    public.has_project_access(project_id)
    AND deleted_at IS NULL
  );

CREATE POLICY "project_comments_client_insert"
  ON public.project_comments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_project_access(project_id)
    AND created_by = auth.uid()
  );

CREATE POLICY "project_comments_client_update_own"
  ON public.project_comments
  FOR UPDATE
  TO authenticated
  USING (
    public.has_project_access(project_id)
    AND created_by = auth.uid()
    AND deleted_at IS NULL
  )
  WITH CHECK (
    public.has_project_access(project_id)
    AND created_by = auth.uid()
  );

-- ========== 008_buildings_floors.sql ==========

-- =============================================================================
-- BuildView Phase 2: Buildings & Floors spatial model
-- =============================================================================

CREATE TABLE public.buildings (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id  UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at  TIMESTAMPTZ,
  CONSTRAINT buildings_project_name_unique UNIQUE (project_id, name)
);

CREATE TABLE public.floors (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  building_id UUID NOT NULL REFERENCES public.buildings(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at  TIMESTAMPTZ,
  CONSTRAINT floors_building_name_unique UNIQUE (building_id, name)
);

CREATE INDEX buildings_project_id_idx ON public.buildings(project_id) WHERE deleted_at IS NULL;
CREATE INDEX floors_building_id_idx ON public.floors(building_id) WHERE deleted_at IS NULL;

COMMENT ON TABLE public.buildings IS 'Physical buildings within a construction project.';
COMMENT ON TABLE public.floors IS 'Floors within a building for workspace scoping.';

-- RLS
ALTER TABLE public.buildings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.floors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buildings FORCE ROW LEVEL SECURITY;
ALTER TABLE public.floors FORCE ROW LEVEL SECURITY;

CREATE POLICY "buildings_staff_all"
  ON public.buildings FOR ALL
  TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

CREATE POLICY "buildings_client_read"
  ON public.buildings FOR SELECT
  TO authenticated
  USING (public.has_project_access(project_id));

CREATE POLICY "floors_staff_all"
  ON public.floors FOR ALL
  TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

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

-- Platform settings (singleton row) + notification insert for staff/system

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

CREATE POLICY "platform_settings_authenticated_read"
  ON public.platform_settings
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "platform_settings_staff_write"
  ON public.platform_settings
  FOR ALL
  TO authenticated
  USING (public.is_buildview_staff())
  WITH CHECK (public.is_buildview_staff());

-- Allow BuildView staff to insert notifications (system alerts from uploads/issues)
CREATE POLICY "notifications_staff_insert"
  ON public.notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_buildview_staff());

COMMENT ON TABLE public.platform_settings IS 'Singleton platform configuration for BuildView ops + client portal.';

-- ========== 010_buildings_staff_rls.sql ==========

-- Allow all BuildView staff to manage buildings/floors (not only super_admin)

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

-- Phase 8: spatial scope columns on content tables

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

-- Phase 8: document version control

ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS document_group_id UUID,
  ADD COLUMN IF NOT EXISTS version_number INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS is_current BOOLEAN NOT NULL DEFAULT true;

-- Backfill existing rows as v1 current documents in their own group
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

-- Phase 12: spatial foreign keys on content tables (alongside legacy text columns)

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

-- Backfill building_id from text building names
UPDATE public.documents d
SET building_id = b.id
FROM public.buildings b
WHERE d.building IS NOT NULL
  AND d.building_id IS NULL
  AND d.project_id = b.project_id
  AND d.building = b.name
  AND b.deleted_at IS NULL;

UPDATE public.timeline_events t
SET building_id = b.id
FROM public.buildings b
WHERE t.building IS NOT NULL
  AND t.building_id IS NULL
  AND t.project_id = b.project_id
  AND t.building = b.name
  AND b.deleted_at IS NULL;

UPDATE public.issues i
SET building_id = b.id
FROM public.buildings b
WHERE i.building IS NOT NULL
  AND i.building_id IS NULL
  AND i.project_id = b.project_id
  AND i.building = b.name
  AND b.deleted_at IS NULL;

UPDATE public.reports r
SET building_id = b.id
FROM public.buildings b
WHERE r.building IS NOT NULL
  AND r.building_id IS NULL
  AND r.project_id = b.project_id
  AND r.building = b.name
  AND b.deleted_at IS NULL;

-- Backfill floor_id from text floor names (requires building_id)
UPDATE public.documents d
SET floor_id = f.id
FROM public.floors f
WHERE d.floor IS NOT NULL
  AND d.floor_id IS NULL
  AND d.building_id = f.building_id
  AND d.floor = f.name
  AND f.deleted_at IS NULL;

UPDATE public.timeline_events t
SET floor_id = f.id
FROM public.floors f
WHERE t.floor IS NOT NULL
  AND t.floor_id IS NULL
  AND t.building_id = f.building_id
  AND t.floor = f.name
  AND f.deleted_at IS NULL;

UPDATE public.issues i
SET floor_id = f.id
FROM public.floors f
WHERE i.floor IS NOT NULL
  AND i.floor_id IS NULL
  AND i.building_id = f.building_id
  AND i.floor = f.name
  AND f.deleted_at IS NULL;

UPDATE public.reports r
SET floor_id = f.id
FROM public.floors f
WHERE r.floor IS NOT NULL
  AND r.floor_id IS NULL
  AND r.building_id = f.building_id
  AND r.floor = f.name
  AND f.deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_documents_spatial_fk
  ON public.documents(project_id, building_id, floor_id) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_timeline_events_spatial_fk
  ON public.timeline_events(project_id, building_id, floor_id) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_issues_spatial_fk
  ON public.issues(project_id, building_id, floor_id) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_reports_spatial_fk
  ON public.reports(project_id, building_id, floor_id) WHERE deleted_at IS NULL;

-- ========== 014_tour_spatial_fk.sql ==========

-- Phase 15: spatial foreign keys on project_tours (alongside description JSON metadata)

ALTER TABLE public.project_tours
  ADD COLUMN IF NOT EXISTS building_id UUID REFERENCES public.buildings(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS floor_id UUID REFERENCES public.floors(id) ON DELETE SET NULL;

-- Backfill building_id from JSON description building names
UPDATE public.project_tours t
SET building_id = b.id
FROM public.buildings b
WHERE t.building_id IS NULL
  AND t.description IS NOT NULL
  AND t.description::jsonb ? 'building'
  AND t.project_id = b.project_id
  AND (t.description::jsonb ->> 'building') = b.name
  AND b.deleted_at IS NULL;

-- Backfill building_id from JSON buildingId when name match is unavailable
UPDATE public.project_tours t
SET building_id = (t.description::jsonb ->> 'buildingId')::uuid
WHERE t.building_id IS NULL
  AND t.description IS NOT NULL
  AND t.description::jsonb ? 'buildingId'
  AND EXISTS (
    SELECT 1 FROM public.buildings b
    WHERE b.id = (t.description::jsonb ->> 'buildingId')::uuid
      AND b.project_id = t.project_id
      AND b.deleted_at IS NULL
  );

-- Backfill floor_id from JSON floor names (requires building_id)
UPDATE public.project_tours t
SET floor_id = f.id
FROM public.floors f
WHERE t.floor_id IS NULL
  AND t.building_id IS NOT NULL
  AND t.description IS NOT NULL
  AND t.description::jsonb ? 'floor'
  AND t.building_id = f.building_id
  AND (t.description::jsonb ->> 'floor') = f.name
  AND f.deleted_at IS NULL;

-- Backfill floor_id from JSON floorId
UPDATE public.project_tours t
SET floor_id = (t.description::jsonb ->> 'floorId')::uuid
WHERE t.floor_id IS NULL
  AND t.building_id IS NOT NULL
  AND t.description IS NOT NULL
  AND t.description::jsonb ? 'floorId'
  AND EXISTS (
    SELECT 1 FROM public.floors f
    WHERE f.id = (t.description::jsonb ->> 'floorId')::uuid
      AND f.building_id = t.building_id
      AND f.deleted_at IS NULL
  );

CREATE INDEX IF NOT EXISTS idx_project_tours_spatial_fk
  ON public.project_tours(project_id, building_id, floor_id) WHERE deleted_at IS NULL;

-- ========== 015_saved_comparisons.sql ==========

-- =============================================================================
-- BuildView Phase 19: Saved comparisons (server persistence)
-- =============================================================================

CREATE TABLE public.saved_comparisons (
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

CREATE INDEX saved_comparisons_user_idx
  ON public.saved_comparisons (user_id)
  WHERE deleted_at IS NULL;

CREATE INDEX saved_comparisons_project_idx
  ON public.saved_comparisons (project_id)
  WHERE deleted_at IS NULL;

ALTER TABLE public.saved_comparisons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_comparisons FORCE ROW LEVEL SECURITY;

CREATE POLICY "saved_comparisons_staff_all"
  ON public.saved_comparisons
  FOR ALL
  TO authenticated
  USING (public.is_buildview_staff())
  WITH CHECK (public.is_buildview_staff());

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

-- ========== 016_timeline_progress_fields.sql ==========

ALTER TABLE public.timeline_events
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'in_progress'
    CHECK (status IN ('in_progress', 'completed')),
  ADD COLUMN IF NOT EXISTS progress_percent INTEGER
    CHECK (progress_percent IS NULL OR (progress_percent >= 0 AND progress_percent <= 100)),
  ADD COLUMN IF NOT EXISTS trades JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS whats_new TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS author_name TEXT;

COMMENT ON COLUMN public.timeline_events.status IS 'Milestone status: in_progress or completed.';
COMMENT ON COLUMN public.timeline_events.progress_percent IS 'Overall construction progress 0–100 for this milestone.';
COMMENT ON COLUMN public.timeline_events.trades IS 'Trade progress bars: [{name, percent, color?}].';
COMMENT ON COLUMN public.timeline_events.whats_new IS 'Bullet highlights shown in the milestone detail panel.';
COMMENT ON COLUMN public.timeline_events.author_name IS 'Display name for who authored this update.';

-- ========== 017_client_dashboard_type.sql ==========

-- Client portal experience: construction monitoring vs portfolio showcase

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS dashboard_type TEXT NOT NULL DEFAULT 'construction'
    CHECK (dashboard_type IN ('construction', 'portfolio'));

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS dashboard_type TEXT
    CHECK (dashboard_type IS NULL OR dashboard_type IN ('construction', 'portfolio'));

COMMENT ON COLUMN public.clients.dashboard_type IS
  'Default client portal: construction (monitoring) or portfolio (showcase walkthroughs).';
COMMENT ON COLUMN public.users.dashboard_type IS
  'Optional per-user portal override; NULL inherits from linked client.';
