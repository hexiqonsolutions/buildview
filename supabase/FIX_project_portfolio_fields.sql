-- REQUIRED: Run in Supabase SQL Editor if portfolio location / sqft / category fields are missing

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS area_sqft INTEGER
    CHECK (area_sqft IS NULL OR area_sqft > 0);

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS portfolio_category TEXT
    CHECK (
      portfolio_category IS NULL
      OR portfolio_category IN ('architecture', 'interior', 'real_estate')
    );

NOTIFY pgrst, 'reload schema';
