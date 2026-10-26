"use server";

import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import type { UserSessionArea } from "@/lib/types";
import { logServerError } from "@/lib/errors/server";

/** Gap after which a new heartbeat starts a fresh session instead of extending. */
const IDLE_GAP_MS = 15 * 60 * 1000;

type PresenceResult = { ok: true } | { ok: false; error: string };

function normalizeArea(area: unknown): UserSessionArea {
  if (area === "admin" || area === "dashboard") return area;
  return "app";
}

function secondsBetween(startIso: string, endIso: string): number {
  const start = Date.parse(startIso);
  const end = Date.parse(endIso);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return 0;
  return Math.floor((end - start) / 1000);
}

/**
 * Heartbeat from an authenticated client while the tab is visible.
 * Extends the open session if last_seen was within IDLE_GAP_MS; otherwise
 * closes any stale open rows and starts a new session.
 */
export async function pingPresence(area: UserSessionArea = "app"): Promise<PresenceResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in" };

  const now = new Date();
  const nowIso = now.toISOString();
  const areaValue = normalizeArea(area);

  try {
    const admin = createServiceRoleClient();

    const { data: openRows, error: openError } = await admin
      .from("user_sessions")
      .select("id, started_at, last_seen_at")
      .eq("user_id", user.id)
      .is("ended_at", null)
      .order("last_seen_at", { ascending: false })
      .limit(5);

    if (openError) {
      if (openError.code === "42P01") {
        return { ok: false, error: "Session tracking is not available yet." };
      }
      logServerError("pingPresence.open", openError, { userId: user.id });
      return { ok: false, error: "Failed to record presence" };
    }

    const latest = openRows?.[0] ?? null;
    const stillActive =
      latest &&
      Number.isFinite(Date.parse(latest.last_seen_at)) &&
      now.getTime() - Date.parse(latest.last_seen_at) <= IDLE_GAP_MS;

    if (stillActive && latest) {
      const duration = secondsBetween(latest.started_at, nowIso);
      const { error: updateError } = await admin
        .from("user_sessions")
        .update({
          last_seen_at: nowIso,
          duration_seconds: duration,
          area: areaValue,
        })
        .eq("id", latest.id);

      if (updateError) {
        logServerError("pingPresence.extend", updateError, { userId: user.id });
        return { ok: false, error: "Failed to record presence" };
      }
      return { ok: true };
    }

    // Close any stale open sessions before opening a new one.
    if (openRows && openRows.length > 0) {
      for (const row of openRows) {
        const endAt = row.last_seen_at;
        await admin
          .from("user_sessions")
          .update({
            ended_at: endAt,
            duration_seconds: secondsBetween(row.started_at, endAt),
          })
          .eq("id", row.id)
          .is("ended_at", null);
      }
    }

    const { error: insertError } = await admin.from("user_sessions").insert({
      user_id: user.id,
      started_at: nowIso,
      last_seen_at: nowIso,
      duration_seconds: 0,
      area: areaValue,
    });

    if (insertError) {
      if (insertError.code === "42P01") {
        return { ok: false, error: "Session tracking is not available yet." };
      }
      logServerError("pingPresence.insert", insertError, { userId: user.id });
      return { ok: false, error: "Failed to record presence" };
    }

    return { ok: true };
  } catch (err) {
    logServerError("pingPresence", err, { userId: user.id });
    return { ok: false, error: "Failed to record presence" };
  }
}

/** Marks the current open session as ended (tab close / long hide). */
export async function endPresence(): Promise<PresenceResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in" };

  const nowIso = new Date().toISOString();

  try {
    const admin = createServiceRoleClient();
    const { data: openRows, error } = await admin
      .from("user_sessions")
      .select("id, started_at, last_seen_at")
      .eq("user_id", user.id)
      .is("ended_at", null)
      .order("last_seen_at", { ascending: false })
      .limit(5);

    if (error) {
      if (error.code === "42P01") return { ok: true };
      logServerError("endPresence.open", error, { userId: user.id });
      return { ok: false, error: "Failed to end presence" };
    }

    for (const row of openRows ?? []) {
      const endAt = row.last_seen_at > nowIso ? row.last_seen_at : nowIso;
      await admin
        .from("user_sessions")
        .update({
          ended_at: endAt,
          last_seen_at: endAt,
          duration_seconds: secondsBetween(row.started_at, endAt),
        })
        .eq("id", row.id)
        .is("ended_at", null);
    }

    return { ok: true };
  } catch (err) {
    logServerError("endPresence", err, { userId: user.id });
    return { ok: false, error: "Failed to end presence" };
  }
}
