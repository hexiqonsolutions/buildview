import "server-only";

import { createServiceRoleClient } from "@/lib/supabase/admin";

export type UserPresenceStats = {
  /** Sum of all recorded session lengths in seconds. */
  timeOnSiteSeconds: number;
  /** Most recent heartbeat / session end. */
  lastSeenAt: string | null;
};

function secondsBetween(startIso: string, endIso: string): number {
  const start = Date.parse(startIso);
  const end = Date.parse(endIso);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return 0;
  return Math.floor((end - start) / 1000);
}

/**
 * Aggregate real time-on-site from user_sessions for the given user ids.
 * Graceful when migration 039 is not applied yet (returns empty map).
 */
export async function getUserPresenceStats(
  userIds: string[]
): Promise<Map<string, UserPresenceStats>> {
  const result = new Map<string, UserPresenceStats>();
  if (userIds.length === 0) return result;

  try {
    const admin = createServiceRoleClient();
    // Paginate in chunks — PostgREST `.in()` has practical URL limits.
    const CHUNK = 200;
    for (let i = 0; i < userIds.length; i += CHUNK) {
      const chunk = userIds.slice(i, i + CHUNK);
      const { data, error } = await admin
        .from("user_sessions")
        .select("user_id, started_at, last_seen_at, ended_at, duration_seconds")
        .in("user_id", chunk);

      if (error) {
        if (error.code !== "42P01") {
          console.warn("[getUserPresenceStats]", error.message);
        }
        return result;
      }

      for (const row of data ?? []) {
        const endIso = row.ended_at ?? row.last_seen_at;
        const seconds =
          row.ended_at != null && row.duration_seconds > 0
            ? row.duration_seconds
            : secondsBetween(row.started_at, endIso);

        const prev = result.get(row.user_id) ?? {
          timeOnSiteSeconds: 0,
          lastSeenAt: null,
        };
        const lastSeenAt =
          !prev.lastSeenAt || Date.parse(endIso) > Date.parse(prev.lastSeenAt)
            ? endIso
            : prev.lastSeenAt;

        result.set(row.user_id, {
          timeOnSiteSeconds: prev.timeOnSiteSeconds + Math.max(0, seconds),
          lastSeenAt,
        });
      }
    }
  } catch (err) {
    console.warn("[getUserPresenceStats] failed:", err);
  }

  return result;
}
