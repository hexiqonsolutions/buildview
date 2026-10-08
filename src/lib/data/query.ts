import "server-only";

const NIL_UUID = "00000000-0000-0000-0000-000000000000";

/** PostgREST rejects `.in(column, [])`; a nil UUID keeps the filter valid while matching no rows. */
export function idsOrNone(ids: string[]): string[] {
  return ids.length > 0 ? ids : [NIL_UUID];
}
