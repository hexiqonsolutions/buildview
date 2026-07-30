-- Run this in Supabase SQL Editor if project comments fail to save.
-- Safe to run multiple times.

DO $$ BEGIN
  CREATE TYPE comment_status AS ENUM ('open', 'resolved');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.project_comments (
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

CREATE INDEX IF NOT EXISTS idx_project_comments_project_id ON public.project_comments(project_id);
CREATE INDEX IF NOT EXISTS idx_project_comments_status ON public.project_comments(status);
CREATE INDEX IF NOT EXISTS idx_project_comments_active ON public.project_comments(project_id) WHERE deleted_at IS NULL;

DO $$ BEGIN
  CREATE TRIGGER trg_project_comments_updated_at
    BEFORE UPDATE ON public.project_comments
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_project_comments_soft_delete
    BEFORE UPDATE ON public.project_comments
    FOR EACH ROW EXECUTE FUNCTION public.set_soft_delete_audit();
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE public.project_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_comments FORCE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'project_comments'
      AND policyname = 'project_comments_super_admin_all'
  ) THEN
    CREATE POLICY "project_comments_super_admin_all"
      ON public.project_comments
      FOR ALL
      TO authenticated
      USING (public.is_super_admin())
      WITH CHECK (public.is_super_admin());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'project_comments'
      AND policyname = 'project_comments_client_select'
  ) THEN
    CREATE POLICY "project_comments_client_select"
      ON public.project_comments
      FOR SELECT
      TO authenticated
      USING (
        public.has_project_access(project_id)
        AND deleted_at IS NULL
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'project_comments'
      AND policyname = 'project_comments_client_insert'
  ) THEN
    CREATE POLICY "project_comments_client_insert"
      ON public.project_comments
      FOR INSERT
      TO authenticated
      WITH CHECK (
        public.has_project_access(project_id)
        AND created_by = auth.uid()
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'project_comments'
      AND policyname = 'project_comments_client_update_own'
  ) THEN
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
  END IF;
END $$;

-- Threaded replies (safe if already applied)
ALTER TABLE public.project_comments
  ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES public.project_comments(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_project_comments_parent_id
  ON public.project_comments(parent_id)
  WHERE deleted_at IS NULL AND parent_id IS NOT NULL;

SELECT 'project_comments ready' AS status;
