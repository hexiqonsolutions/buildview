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
