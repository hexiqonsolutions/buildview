-- =============================================================================
-- 044 — Property details for portfolio (real estate) projects
--
-- property_details: one optional row per project (buyer-facing facts).
-- property_units:   repeatable unit types / floor plans per project.
--
-- Every content column is nullable: creating a project never requires them.
-- hidden_fields holds field keys (e.g. 'price_min') and section keys
-- (e.g. 'section:pricing') that staff hid from the buyer page. It is a
-- presentation setting, not access control.
--
-- Files (floor plans, brochure PDF) live in the existing private
-- project-media bucket under {project_id}/..., so 027's storage RLS applies.
--
-- Apply in Supabase → SQL Editor. Safe to re-run.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.property_details (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id        UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,

  -- Overview
  property_type     TEXT CHECK (
    property_type IS NULL OR property_type IN (
      'apartment', 'villa', 'row_house', 'plot', 'penthouse', 'studio',
      'commercial', 'office', 'retail', 'mixed_use'
    )
  ),
  property_status   TEXT CHECK (
    property_status IS NULL OR property_status IN (
      'new_launch', 'under_construction', 'ready_to_move', 'completed'
    )
  ),
  possession_date   DATE,
  rera_number       TEXT,
  towers            INTEGER CHECK (towers IS NULL OR towers >= 0),
  floors            INTEGER CHECK (floors IS NULL OR floors >= 0),
  total_units       INTEGER CHECK (total_units IS NULL OR total_units >= 0),
  description       TEXT,

  -- Pricing
  price_min         NUMERIC(14, 2) CHECK (price_min IS NULL OR price_min >= 0),
  price_max         NUMERIC(14, 2) CHECK (price_max IS NULL OR price_max >= 0),
  price_per_sqft    NUMERIC(12, 2) CHECK (price_per_sqft IS NULL OR price_per_sqft >= 0),
  price_mode        TEXT CHECK (price_mode IS NULL OR price_mode IN ('show', 'on_request', 'hide')),

  -- Location
  latitude          DOUBLE PRECISION CHECK (latitude IS NULL OR latitude BETWEEN -90 AND 90),
  longitude         DOUBLE PRECISION CHECK (longitude IS NULL OR longitude BETWEEN -180 AND 180),
  nearby_places     JSONB,   -- [{ name, type, distance }]

  -- Amenities / specifications
  amenities         TEXT[],
  specifications    JSONB,   -- [{ label, value }]

  -- Media + enquiry
  video_url         TEXT,    -- optional external walkthrough video (YouTube / Vimeo)
  brochure_path     TEXT,    -- project-media/{project_id}/...pdf
  brochure_file_name TEXT,
  enquiry_phone     TEXT,
  whatsapp_number   TEXT,
  enquiry_email     TEXT,

  hidden_fields     TEXT[],

  created_by        UUID REFERENCES public.users(id) ON DELETE SET NULL,
  updated_by        UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT property_details_project_unique UNIQUE (project_id)
);

DROP TRIGGER IF EXISTS trg_property_details_updated_at ON public.property_details;
CREATE TRIGGER trg_property_details_updated_at
  BEFORE UPDATE ON public.property_details
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.property_units (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id          UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  configuration       TEXT,
  carpet_area_sqft    NUMERIC(10, 2) CHECK (carpet_area_sqft IS NULL OR carpet_area_sqft >= 0),
  built_up_area_sqft  NUMERIC(10, 2) CHECK (built_up_area_sqft IS NULL OR built_up_area_sqft >= 0),
  price               NUMERIC(14, 2) CHECK (price IS NULL OR price >= 0),
  units_available     INTEGER CHECK (units_available IS NULL OR units_available >= 0),
  floor_plan_path     TEXT,  -- project-media/{project_id}/...
  sort_order          INTEGER NOT NULL DEFAULT 0,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_property_units_project
  ON public.property_units (project_id, sort_order);

DROP TRIGGER IF EXISTS trg_property_units_updated_at ON public.property_units;
CREATE TRIGGER trg_property_units_updated_at
  BEFORE UPDATE ON public.property_units
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------------------------------------------
-- RLS: staff write, project members read (same pattern as 027 project_media)
-- -----------------------------------------------------------------------------

ALTER TABLE public.property_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_units ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "property_details_staff_all" ON public.property_details;
CREATE POLICY "property_details_staff_all"
  ON public.property_details
  FOR ALL TO authenticated
  USING (public.is_buildview_staff())
  WITH CHECK (public.is_buildview_staff());

DROP POLICY IF EXISTS "property_details_client_select" ON public.property_details;
CREATE POLICY "property_details_client_select"
  ON public.property_details
  FOR SELECT TO authenticated
  USING (public.has_project_access(project_id));

DROP POLICY IF EXISTS "property_units_staff_all" ON public.property_units;
CREATE POLICY "property_units_staff_all"
  ON public.property_units
  FOR ALL TO authenticated
  USING (public.is_buildview_staff())
  WITH CHECK (public.is_buildview_staff());

DROP POLICY IF EXISTS "property_units_client_select" ON public.property_units;
CREATE POLICY "property_units_client_select"
  ON public.property_units
  FOR SELECT TO authenticated
  USING (public.has_project_access(project_id));

-- -----------------------------------------------------------------------------
-- Allow brochure PDFs in the project-media bucket (floor plans reuse images)
-- -----------------------------------------------------------------------------

UPDATE storage.buckets
SET allowed_mime_types = ARRAY[
  'video/mp4', 'video/webm', 'video/quicktime',
  'image/gif', 'image/jpeg', 'image/png', 'image/webp',
  'application/pdf'
]::text[]
WHERE id = 'project-media';

NOTIFY pgrst, 'reload schema';
