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
