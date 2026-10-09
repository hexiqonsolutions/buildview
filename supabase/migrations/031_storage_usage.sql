-- Real Supabase Storage usage for the admin Storage Manager.
-- Sums object sizes per bucket and top-level folder. Project buckets store files
-- under "<project_id>/...", so the folder maps usage back to a project and client.
-- Callable only with the service role.

CREATE OR REPLACE FUNCTION public.get_storage_usage()
RETURNS TABLE (bucket_id TEXT, folder TEXT, bytes BIGINT, file_count BIGINT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, storage
AS $$
  SELECT
    o.bucket_id::TEXT,
    split_part(o.name, '/', 1) AS folder,
    COALESCE(SUM((o.metadata->>'size')::BIGINT), 0)::BIGINT AS bytes,
    COUNT(*)::BIGINT AS file_count
  FROM storage.objects o
  GROUP BY o.bucket_id, split_part(o.name, '/', 1);
$$;

REVOKE ALL ON FUNCTION public.get_storage_usage() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_storage_usage() FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_storage_usage() TO service_role;
