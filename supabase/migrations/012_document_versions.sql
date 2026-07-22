-- Phase 8: document version control

ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS document_group_id UUID,
  ADD COLUMN IF NOT EXISTS version_number INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS is_current BOOLEAN NOT NULL DEFAULT true;

-- Backfill existing rows as v1 current documents in their own group
UPDATE public.documents
SET document_group_id = id
WHERE document_group_id IS NULL;

ALTER TABLE public.documents
  ALTER COLUMN document_group_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_documents_group_current
  ON public.documents(document_group_id, is_current)
  WHERE deleted_at IS NULL AND is_current = true;

CREATE UNIQUE INDEX IF NOT EXISTS idx_documents_group_version
  ON public.documents(document_group_id, version_number)
  WHERE deleted_at IS NULL;
