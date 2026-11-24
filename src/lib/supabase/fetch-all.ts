/**
 * Supabase (PostgREST) returns at most 1,000 rows per request. Page through a
 * query until every row is read. `build(from, to)` must return the same query
 * with a stable order (e.g. `.order("id")`) and `.range(from, to)` applied.
 */
export async function fetchAllRows<T>(
  build: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>,
  { pageSize = 1000, maxRows = 100_000 }: { pageSize?: number; maxRows?: number } = {}
): Promise<{ data: T[]; error: unknown }> {
  const rows: T[] = [];
  for (let from = 0; from < maxRows; from += pageSize) {
    const { data, error } = await build(from, from + pageSize - 1);
    if (error) return { data: rows, error };
    const page = data ?? [];
    rows.push(...page);
    if (page.length < pageSize) break;
  }
  return { data: rows, error: null };
}
