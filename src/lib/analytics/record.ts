/**
 * First-party traffic recording (server-internal). Writes with the service
 * role; never throws — analytics must not break a page.
 */
import "server-only";
import { createHash } from "crypto";
import { cookies } from "next/headers";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { getActiveActor } from "@/lib/auth/project-access";
import { isBuildViewStaffRole } from "@/lib/auth/roles";
import { siteConfig } from "@/lib/site-config";
import type { UserRole } from "@/lib/types";
import {
  CONVERSION_EVENTS,
  MAX_ACTIVE_SECONDS,
  VISIT_WINDOW_MS,
  botSource,
  clampSeconds,
  deviceClass,
  parseUtm,
  referrerHost,
  trafficSource,
} from "@/lib/analytics/classify";

const OWN_HOST = (() => {
  try {
    return new URL(siteConfig.url).hostname;
  } catch {
    return null;
  }
})();

export function analyticsIpHash(ip: string): string {
  const salt = process.env.ANALYTICS_SALT || process.env.CRON_SECRET || "buildview-analytics";
  return createHash("sha256").update(`${salt}:${ip.trim().toLowerCase()}`).digest("hex").slice(0, 32);
}

type Ctx = { userAgent: string | null; ip: string; country: string | null; city: string | null; host: string | null };

export function requestContext(h: Headers): Ctx {
  const fwd = h.get("x-forwarded-for")?.split(",")[0]?.trim();
  const decode = (v: string | null) => {
    if (!v) return null;
    try {
      return decodeURIComponent(v).slice(0, 80);
    } catch {
      return v.slice(0, 80);
    }
  };
  return {
    userAgent: h.get("user-agent"),
    ip: fwd || h.get("x-real-ip") || "0.0.0.0",
    country: h.get("x-vercel-ip-country"),
    city: decode(h.get("x-vercel-ip-city")),
    host: h.get("host"),
  };
}

/** Only count real visitors on the live site: not bots, previews, staff, or test hosts. */
async function shouldCount(ctx: Ctx): Promise<boolean> {
  if (process.env.VERCEL_ENV && process.env.VERCEL_ENV !== "production") return false;
  if (ctx.host && /localhost|127\.0\.0\.1/.test(ctx.host)) return false;
  if (botSource(ctx.userAgent)) return false;
  // Signed-in BuildView staff are not visitors.
  const jar = await cookies();
  if (jar.getAll().some((c) => c.name.startsWith("sb-") && c.name.includes("auth-token"))) {
    const actor = await getActiveActor().catch(() => null);
    if (actor && isBuildViewStaffRole(actor.role as UserRole)) return false;
  }
  return true;
}

const cleanVid = (v: unknown) => (typeof v === "string" && /^[A-Za-z0-9_-]{8,64}$/.test(v) ? v : null);
const cleanPath = (v: unknown) => (typeof v === "string" && v.startsWith("/") ? v.slice(0, 300) : null);

// ------------------------------------------------------------ share links

async function shareByToken(token: string) {
  if (typeof token !== "string" || token.length < 24 || token.length > 128) return null;
  const { data } = await createServiceRoleClient()
    .from("tour_shares")
    .select("id, tour_id, project_id")
    .eq("token", token)
    .maybeSingle();
  return data as { id: string; tour_id: string; project_id: string } | null;
}

/** A link-preview / crawler fetch of a share page (one row per source per 10 minutes). */
export async function recordSharePreview(token: string, h: Headers): Promise<void> {
  try {
    const ctx = requestContext(h);
    const source = botSource(ctx.userAgent);
    if (!source) return;
    const share = await shareByToken(token);
    if (!share) return;
    const admin = createServiceRoleClient();
    const since = new Date(Date.now() - 10 * 60_000).toISOString();
    const { count } = await admin
      .from("tour_share_visits" as never)
      .select("id", { count: "exact", head: true })
      .eq("share_id", share.id)
      .eq("is_preview", true)
      .eq("preview_source", source)
      .gte("visit_started_at", since);
    if ((count ?? 0) > 0) return;
    await admin.from("tour_share_visits" as never).insert({
      share_id: share.id,
      tour_id: share.tour_id,
      project_id: share.project_id,
      visitor_id: `bot:${source}`,
      is_preview: true,
      preview_source: source,
      device: null,
    } as never);
  } catch (err) {
    console.error("[analytics] share preview", err);
  }
}

/** A person opened a share link → visit id (reused within 30 minutes). */
export async function recordShareOpen(
  input: { token: unknown; vid: unknown; referrer?: unknown },
  h: Headers
): Promise<string | null> {
  try {
    const vid = cleanVid(input.vid);
    if (!vid) return null;
    const ctx = requestContext(h);
    if (!(await shouldCount(ctx))) return null;
    const share = await shareByToken(input.token as string);
    if (!share) return null;
    const admin = createServiceRoleClient();
    const since = new Date(Date.now() - VISIT_WINDOW_MS).toISOString();
    const { data: recent } = await admin
      .from("tour_share_visits" as never)
      .select("id")
      .eq("share_id", share.id)
      .eq("visitor_id", vid)
      .gte("last_seen_at", since)
      .order("last_seen_at", { ascending: false })
      .limit(1);
    const existing = (recent as unknown as { id: string }[] | null)?.[0];
    if (existing) {
      await admin.from("tour_share_visits" as never).update({ last_seen_at: new Date().toISOString() } as never).eq("id", existing.id);
      return existing.id;
    }
    const { data } = await admin
      .from("tour_share_visits" as never)
      .insert({
        share_id: share.id,
        tour_id: share.tour_id,
        project_id: share.project_id,
        visitor_id: vid,
        device: deviceClass(ctx.userAgent),
        country: ctx.country,
        city: ctx.city,
        referrer_host: referrerHost(typeof input.referrer === "string" ? input.referrer : null, OWN_HOST),
        ip_hash: analyticsIpHash(ctx.ip),
      } as never)
      .select("id")
      .single();
    return (data as { id: string } | null)?.id ?? null;
  } catch (err) {
    console.error("[analytics] share open", err);
    return null;
  }
}

/** Adds active seconds while the tour is on screen. */
export async function recordShareHeartbeat(input: { visitId: unknown; vid: unknown; seconds: unknown }): Promise<void> {
  try {
    const vid = cleanVid(input.vid);
    const seconds = clampSeconds(input.seconds);
    if (!vid || !seconds || typeof input.visitId !== "string") return;
    const admin = createServiceRoleClient();
    const { data } = await admin
      .from("tour_share_visits" as never)
      .select("id, active_seconds")
      .eq("id", input.visitId)
      .eq("visitor_id", vid)
      .maybeSingle();
    const row = data as { id: string; active_seconds: number } | null;
    if (!row) return;
    await admin
      .from("tour_share_visits" as never)
      .update({
        active_seconds: Math.min(MAX_ACTIVE_SECONDS, row.active_seconds + seconds),
        last_seen_at: new Date().toISOString(),
      } as never)
      .eq("id", row.id);
  } catch (err) {
    console.error("[analytics] share heartbeat", err);
  }
}

/** The visitor passed the gate: link the visit to the viewer row. */
export async function markShareUnlocked(input: { visitId?: string | null; vid?: string | null; shareId: string; viewId?: string | null }): Promise<void> {
  try {
    const vid = cleanVid(input.vid);
    if (!input.visitId || !vid) return;
    const patch: Record<string, unknown> = { last_seen_at: new Date().toISOString() };
    if (input.viewId) patch.view_id = input.viewId;
    const admin = createServiceRoleClient();
    await admin
      .from("tour_share_visits" as never)
      .update({ ...patch, unlocked_at: new Date().toISOString() } as never)
      .eq("id", input.visitId)
      .eq("visitor_id", vid)
      .eq("share_id", input.shareId)
      .is("unlocked_at", null);
    if (input.viewId) {
      await admin
        .from("tour_share_visits" as never)
        .update({ view_id: input.viewId } as never)
        .eq("id", input.visitId)
        .eq("visitor_id", vid);
    }
  } catch (err) {
    console.error("[analytics] share unlock", err);
  }
}

// ---------------------------------------------------------------- website

/** A page view on the public site → { visitId, eventId } (visit reused within 30 min). */
export async function recordPageView(
  input: { vid: unknown; returning?: unknown; path: unknown; search?: unknown; referrer?: unknown },
  h: Headers
): Promise<{ visitId: string; eventId: string } | null> {
  try {
    const vid = cleanVid(input.vid);
    const path = cleanPath(input.path);
    if (!vid || !path) return null;
    const ctx = requestContext(h);
    if (!(await shouldCount(ctx))) return null;
    const admin = createServiceRoleClient();
    const now = new Date().toISOString();
    const since = new Date(Date.now() - VISIT_WINDOW_MS).toISOString();
    const { data: recent } = await admin
      .from("site_visits" as never)
      .select("id, page_views")
      .eq("visitor_id", vid)
      .gte("last_seen_at", since)
      .order("last_seen_at", { ascending: false })
      .limit(1);
    let visit = (recent as unknown as { id: string; page_views: number }[] | null)?.[0];
    if (visit) {
      await admin
        .from("site_visits" as never)
        .update({ last_seen_at: now, exit_path: path, page_views: visit.page_views + 1 } as never)
        .eq("id", visit.id);
    } else {
      const utm = parseUtm(typeof input.search === "string" ? input.search : "");
      const refHost = referrerHost(typeof input.referrer === "string" ? input.referrer : null, OWN_HOST);
      const { data } = await admin
        .from("site_visits" as never)
        .insert({
          visitor_id: vid,
          is_returning: input.returning === true,
          entry_path: path,
          exit_path: path,
          page_views: 1,
          referrer_host: refHost,
          source: trafficSource(refHost, utm),
          utm_source: utm.source,
          utm_medium: utm.medium,
          utm_campaign: utm.campaign,
          device: deviceClass(ctx.userAgent),
          country: ctx.country,
          city: ctx.city,
          ip_hash: analyticsIpHash(ctx.ip),
        } as never)
        .select("id, page_views")
        .single();
      visit = data as unknown as { id: string; page_views: number } | undefined;
    }
    if (!visit) return null;
    const { data: ev } = await admin
      .from("site_events" as never)
      .insert({ visit_id: visit.id, kind: "page_view", name: "page_view", path } as never)
      .select("id")
      .single();
    return { visitId: visit.id, eventId: (ev as { id: string } | null)?.id ?? "" };
  } catch (err) {
    console.error("[analytics] page view", err);
    return null;
  }
}

/** Active time on a page (and its visit). */
export async function recordSiteHeartbeat(input: { visitId: unknown; eventId?: unknown; vid: unknown; seconds: unknown }): Promise<void> {
  try {
    const vid = cleanVid(input.vid);
    const seconds = clampSeconds(input.seconds);
    if (!vid || !seconds || typeof input.visitId !== "string") return;
    const admin = createServiceRoleClient();
    const { data } = await admin
      .from("site_visits" as never)
      .select("id, active_seconds")
      .eq("id", input.visitId)
      .eq("visitor_id", vid)
      .maybeSingle();
    const visit = data as { id: string; active_seconds: number } | null;
    if (!visit) return;
    await admin
      .from("site_visits" as never)
      .update({ active_seconds: Math.min(MAX_ACTIVE_SECONDS, visit.active_seconds + seconds), last_seen_at: new Date().toISOString() } as never)
      .eq("id", visit.id);
    if (typeof input.eventId === "string" && input.eventId) {
      const { data: ev } = await admin
        .from("site_events" as never)
        .select("id, active_seconds")
        .eq("id", input.eventId)
        .eq("visit_id", visit.id)
        .maybeSingle();
      const e = ev as { id: string; active_seconds: number } | null;
      if (e) {
        await admin
          .from("site_events" as never)
          .update({ active_seconds: Math.min(MAX_ACTIVE_SECONDS, e.active_seconds + seconds) } as never)
          .eq("id", e.id);
      }
    }
  } catch (err) {
    console.error("[analytics] site heartbeat", err);
  }
}

const KNOWN_EVENTS = new Set<string>([...CONVERSION_EVENTS, "login_click", "cta_click"]);

/** A conversion or tracked click within a visit. */
export async function recordSiteEvent(input: { visitId: unknown; vid: unknown; name: unknown; path?: unknown }): Promise<void> {
  try {
    const vid = cleanVid(input.vid);
    const name = typeof input.name === "string" ? input.name : "";
    if (!vid || !KNOWN_EVENTS.has(name) || typeof input.visitId !== "string") return;
    const admin = createServiceRoleClient();
    const { data } = await admin
      .from("site_visits" as never)
      .select("id")
      .eq("id", input.visitId)
      .eq("visitor_id", vid)
      .maybeSingle();
    if (!data) return;
    const conversion = (CONVERSION_EVENTS as readonly string[]).includes(name);
    await admin.from("site_events" as never).insert({
      visit_id: input.visitId,
      kind: conversion ? "conversion" : "click",
      name,
      path: cleanPath(input.path),
    } as never);
    if (conversion) {
      await admin.from("site_visits" as never).update({ converted: true } as never).eq("id", input.visitId);
    }
  } catch (err) {
    console.error("[analytics] site event", err);
  }
}

/** Delete analytics older than 13 months (called by the daily cron). */
export async function pruneAnalytics(): Promise<void> {
  try {
    const cutoff = new Date(Date.now() - 395 * 86_400_000).toISOString();
    const admin = createServiceRoleClient();
    await admin.from("tour_share_visits" as never).delete().lt("visit_started_at", cutoff);
    await admin.from("site_visits" as never).delete().lt("started_at", cutoff);
  } catch (err) {
    console.error("[analytics] prune", err);
  }
}
