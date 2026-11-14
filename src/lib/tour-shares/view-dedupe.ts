/**
 * Tour share view deduplication helpers (pure — safe for scripts / unit checks).
 *
 * Documented rule (Phase 1):
 * For a given share_id, a second gate submission with the same normalized email
 * within VIEW_DEDUPE_WINDOW_MS does not create another tour_share_views row.
 * Distinct emails, or the same email after the window, still create new rows.
 *
 * Session restore must call the unlock path with recordView=false so reloads
 * never insert at all (client responsibility; this module backs the server check).
 */

/** 24 hours — same visitor re-submitting / double-click within a day. */
export const VIEW_DEDUPE_WINDOW_MS = 24 * 60 * 60 * 1000;

export function normalizeViewerEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Returns true when an existing view row should suppress a new insert.
 * `existingCreatedAt` is ISO timestamp of a prior row for the same share + email.
 */
export function shouldSkipDuplicateView(params: {
  existingCreatedAt: string | null | undefined;
  nowMs?: number;
  windowMs?: number;
}): boolean {
  if (!params.existingCreatedAt) return false;
  const created = new Date(params.existingCreatedAt).getTime();
  if (Number.isNaN(created)) return false;
  const now = params.nowMs ?? Date.now();
  const windowMs = params.windowMs ?? VIEW_DEDUPE_WINDOW_MS;
  return now - created < windowMs;
}
