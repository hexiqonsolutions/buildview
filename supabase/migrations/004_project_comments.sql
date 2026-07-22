-- =============================================================================
-- BuildView — Migration 004: Project Comments
-- =============================================================================
-- Lets clients leave feedback / change requests on a project, and lets the
-- BuildView team reply and mark items resolved. Run after 001, 002, 003.
-- =============================================================================

CREATE TYPE comment_status AS ENUM ('open', 'resolved');

CREATE TABLE public.project_comments (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id    UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  message       TEXT NOT NULL,
  status        comment_status NOT NULL DEFAULT 'open',
  created_by    UUID REFERENCES public.users(id) ON DELETE SET NULL,
  updated_by    UUID REFERENCES public.users(id) ON DELETE SET NULL,
  deleted_by    UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at    TIMESTAMPTZ,
  CONSTRAINT project_comments_message_not_blank CHECK (length(trim(message)) > 0)
);

COMMENT ON TABLE public.project_comments IS 'Client feedback / change requests and admin replies on a project.';

CREATE INDEX idx_project_comments_project_id ON public.project_comments(project_id);
CREATE INDEX idx_project_comments_status ON public.project_comments(status);
CREATE INDEX idx_project_comments_active ON public.project_comments(project_id) WHERE deleted_at IS NULL;

CREATE TRIGGER trg_project_comments_updated_at
  BEFORE UPDATE ON public.project_comments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_project_comments_soft_delete
  BEFORE UPDATE ON public.project_comments
  FOR EACH ROW EXECUTE FUNCTION public.set_soft_delete_audit();

-- =============================================================================
-- Row Level Security
-- =============================================================================

ALTER TABLE public.project_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_comments FORCE ROW LEVEL SECURITY;

CREATE POLICY "project_comments_super_admin_all"
  ON public.project_comments
  FOR ALL
  TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

CREATE POLICY "project_comments_client_select"
  ON public.project_comments
  FOR SELECT
  TO authenticated
  USING (
    public.has_project_access(project_id)
    AND deleted_at IS NULL
  );

CREATE POLICY "project_comments_client_insert"
  ON public.project_comments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_project_access(project_id)
    AND created_by = auth.uid()
  );

CREATE POLICY "project_comments_client_update_own"
  ON public.project_comments
  FOR UPDATE
  TO authenticated
  USING (
    public.has_project_access(project_id)
    AND created_by = auth.uid()
    AND deleted_at IS NULL
  )
  WITH CHECK (
    public.has_project_access(project_id)
    AND created_by = auth.uid()
  );
