-- Portfolio project metadata: area + category for architecture / interior / real estate

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS area_sqft INTEGER
    CHECK (area_sqft IS NULL OR area_sqft > 0);

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS portfolio_category TEXT
    CHECK (
      portfolio_category IS NULL
      OR portfolio_category IN ('architecture', 'interior', 'real_estate')
    );

COMMENT ON COLUMN public.projects.area_sqft IS
  'Optional project floor area in square feet (portfolio showcase).';
COMMENT ON COLUMN public.projects.portfolio_category IS
  'Portfolio category: architecture | interior | real_estate.';

NOTIFY pgrst, 'reload schema';
