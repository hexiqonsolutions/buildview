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
