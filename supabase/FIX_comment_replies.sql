-- Run in Supabase SQL Editor to enable comment replies.
-- Safe to run multiple times.

ALTER TABLE public.project_comments
  ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES public.project_comments(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_project_comments_parent_id
  ON public.project_comments(parent_id)
  WHERE deleted_at IS NULL AND parent_id IS NOT NULL;

SELECT 'comment replies ready' AS status;
