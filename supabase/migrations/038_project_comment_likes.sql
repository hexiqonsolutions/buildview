-- ============================================================================
-- BuildView — migration 038: likes for project comments (Team Discussion)
-- ============================================================================
-- Adds project_comment_likes so the threaded comment UI can show a real
-- Like button with a count and per-user state (like the reference design).
--
-- One like per user per comment (unique pair). Deleting a comment or user
-- cascades their likes. The app reads/writes through the service role after
-- its own auth + project-access checks; RLS is enabled with owner-scoped
-- policies for direct authenticated access.
--
-- Apply in Supabase → SQL Editor. Safe to re-run.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.project_comment_likes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  comment_id UUID NOT NULL REFERENCES public.project_comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now()),
  UNIQUE (comment_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_project_comment_likes_comment
  ON public.project_comment_likes (comment_id);

CREATE INDEX IF NOT EXISTS idx_project_comment_likes_user
  ON public.project_comment_likes (user_id);

ALTER TABLE public.project_comment_likes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "project_comment_likes_select" ON public.project_comment_likes;
CREATE POLICY "project_comment_likes_select" ON public.project_comment_likes
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "project_comment_likes_insert" ON public.project_comment_likes;
CREATE POLICY "project_comment_likes_insert" ON public.project_comment_likes
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "project_comment_likes_delete" ON public.project_comment_likes;
CREATE POLICY "project_comment_likes_delete" ON public.project_comment_likes
  FOR DELETE TO authenticated USING (auth.uid() = user_id);
