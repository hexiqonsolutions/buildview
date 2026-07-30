-- =============================================================================
-- BuildView — Migration 024: Comment replies (threaded discussion)
-- =============================================================================
-- Adds parent_id so team members can reply to each other's project comments.
-- Replies nest one level under a root comment.
-- =============================================================================

ALTER TABLE public.project_comments
  ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES public.project_comments(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_project_comments_parent_id
  ON public.project_comments(parent_id)
  WHERE deleted_at IS NULL AND parent_id IS NOT NULL;

COMMENT ON COLUMN public.project_comments.parent_id IS
  'When set, this comment is a reply under the root thread (parent_id points at the root comment).';
