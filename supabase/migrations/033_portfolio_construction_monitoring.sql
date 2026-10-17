-- Allow Construction Monitoring as a portfolio project category.

ALTER TABLE public.projects
  DROP CONSTRAINT IF EXISTS projects_portfolio_category_check;

ALTER TABLE public.projects
  ADD CONSTRAINT projects_portfolio_category_check
  CHECK (
    portfolio_category IS NULL
    OR portfolio_category IN (
      'architecture',
      'interior',
      'real_estate',
      'construction_monitoring'
    )
  );

COMMENT ON COLUMN public.projects.portfolio_category IS
  'Portfolio category: architecture | interior | real_estate | construction_monitoring.';
