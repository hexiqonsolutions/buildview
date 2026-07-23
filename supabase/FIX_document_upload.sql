-- Run in Supabase SQL Editor if document upload fails due to missing columns / storage policies

-- Spatial + version columns used by the app
ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS building TEXT,
  ADD COLUMN IF NOT EXISTS floor TEXT;

ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS building_id UUID,
  ADD COLUMN IF NOT EXISTS floor_id UUID;

ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS document_group_id UUID,
  ADD COLUMN IF NOT EXISTS version_number INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS is_current BOOLEAN NOT NULL DEFAULT true;

UPDATE public.documents
SET document_group_id = id
WHERE document_group_id IS NULL;

ALTER TABLE public.documents
  ALTER COLUMN document_group_id SET NOT NULL;

-- Staff can manage documents (policies historically used is_super_admin, which may be staff-aware)
DROP POLICY IF EXISTS "documents_staff_all" ON public.documents;
CREATE POLICY "documents_staff_all"
  ON public.documents
  FOR ALL
  TO authenticated
  USING (public.is_buildview_staff())
  WITH CHECK (public.is_buildview_staff());

-- Storage: staff write access for documents bucket
DROP POLICY IF EXISTS "storage_documents_staff_all" ON storage.objects;
CREATE POLICY "storage_documents_staff_all"
  ON storage.objects
  FOR ALL
  TO authenticated
  USING (bucket_id = 'documents' AND public.is_buildview_staff())
  WITH CHECK (bucket_id = 'documents' AND public.is_buildview_staff());

NOTIFY pgrst, 'reload schema';
