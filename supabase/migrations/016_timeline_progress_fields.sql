-- Timeline milestones: store real progress fields (no auto-generated placeholders)

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
