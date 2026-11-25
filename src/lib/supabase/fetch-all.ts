/**
 * Supabase (PostgREST) returns at most 1,000 rows per request. Page through a
 * query until every row is read: the first page alone, then the following
 * pages a few at a time in parallel. `build(from, to)` must return the same
 * query with a stable order (e.g. `.order("id")`) and `.range(from, to)`.
 */
export async function fetchAllRows<T>(
  build: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>,
  {
    pageSize = 1000,
    maxRows = 100_000,
    parallel = 4,
  }: { pageSize?: number; maxRows?: number; parallel?: number } = {}
): Promise<{ data: T[]; error: unknown }> {
  const first = await build(0, pageSize - 1);
  if (first.error) return { data: [], error: first.error };
  const rows: T[] = [...(first.data ?? [])];
  if ((first.data ?? []).length < pageSize) return { data: rows, error: null };

  for (let from = pageSize; from < maxRows; from += pageSize * parallel) {
    const starts = Array.from({ length: parallel }, (_, i) => from + i * pageSize).filter((s) => s < maxRows);
    const pages = await Promise.all(starts.map((s) => build(s, s + pageSize - 1)));
    for (const page of pages) {
      if (page.error) return { data: rows, error: page.error };
      const data = page.data ?? [];
      rows.push(...data);
      if (data.length < pageSize) return { data: rows, error: null };
    }
  }
  return { data: rows, error: null };
}
