"use server";

import { z } from "zod";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { fetchAllRows } from "@/lib/supabase/fetch-all";
import { canViewProject, getActiveActor } from "@/lib/auth/project-access";
import { isBuildViewStaffRole } from "@/lib/auth/roles";
import { hasStaffPermission } from "@/lib/auth/staff";
import { getErrorMessage, PublicError } from "@/lib/errors/public";
import { validate } from "@/lib/validations/parse";
import {
  countBy,
  dailyOpens,
  dayRange,
  istDay,
  istDayStartIso,
  linkStats,
  percentChange,
  type LinkStats,
  type ShareVisitRow,
} from "@/lib/analytics/aggregate";
import { CONVERSION_EVENTS, SITE_EVENT_LABELS } from "@/lib/analytics/classify";
import type { UserRole } from "@/lib/types";

const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const rangeSchema = z
  .object({ from: day, to: day, projectId: z.string().uuid().nullable().optional() })
  .strict()
  .refine((r) => r.from <= r.to, "Start date must be before the end date.");

type Range = z.infer<typeof rangeSchema>;

function endIso(to: string) {
  return new Date(new Date(istDayStartIso(to)).getTime() + 86_400_000).toISOString();
}

function isMissingTable(error: { code?: string; message?: string } | null | undefined) {
  return Boolean(error && (error.code === "42P01" || error.code === "PGRST205" || /does not exist|schema cache/i.test(error.message ?? "")));
}

const MIGRATION = "Traffic analytics need database migration 056. Run it in Supabase first.";

async function requireLinkStaff() {
  if (!(await hasStaffPermission("read", "tour_viewers"))) throw new PublicError("You don't have access to link analytics.");
}

async function requireStaff() {
  const actor = await getActiveActor();
  if (!actor || !isBuildViewStaffRole(actor.role as UserRole)) throw new PublicError("Only BuildView staff can see website analytics.");
  return actor;
}

async function shareVisits(filter: { from: string; to: string; projectId?: string | null; shareIds?: string[]; tourIds?: string[] }) {
  const admin = createServiceRoleClient();
  return fetchAllRows((a, b) => {
    let q = admin
      .from("tour_share_visits" as never)
      .select("share_id, tour_id, visitor_id, is_preview, preview_source, visit_started_at, active_seconds, unlocked_at, view_id, device, country, referrer_host")
      .gte("visit_started_at", istDayStartIso(filter.from))
      .lt("visit_started_at", endIso(filter.to));
    if (filter.projectId) q = q.eq("project_id", filter.projectId);
    if (filter.shareIds?.length) q = q.in("share_id", filter.shareIds);
    if (filter.tourIds?.length) q = q.in("tour_id", filter.tourIds);
    return q.order("visit_started_at").range(a, b);
  });
}

type VisitRow = ShareVisitRow & { tour_id: string | null; view_id: string | null };

// ------------------------------------------------------------ share links

export type LinkRow = LinkStats & {
  shareId: string;
  tourId: string;
  tourName: string;
  projectId: string;
  projectName: string;
  createdByName: string | null;
  createdAt: string;
  expiresAt: string;
  status: "active" | "expired" | "revoked";
};

export type LinkAnalyticsView =
  | { ok: false; error: string }
  | {
      ok: true;
      totals: LinkStats;
      daily: { date: string; opens: number; unlocked: number }[];
      links: LinkRow[];
      previewSources: { label: string; count: number }[];
    };

export async function getLinkAnalytics(input: unknown): Promise<LinkAnalyticsView> {
  const parsed = validate(rangeSchema, input);
  if (!parsed.success) return { ok: false, error: parsed.error };
  try {
    await requireLinkStaff();
    const range = parsed.data as Range;
    const { data: rows, error } = await shareVisits(range);
    if (error) return { ok: false, error: isMissingTable(error as never) ? MIGRATION : "Could not load link analytics." };
    const visits = rows as unknown as VisitRow[];

    const admin = createServiceRoleClient();
    let sharesQ = admin
      .from("tour_shares")
      .select("id, tour_id, project_id, created_by, created_at, expires_at, revoked_at")
      .order("created_at", { ascending: false })
      .limit(1000);
    if (range.projectId) sharesQ = sharesQ.eq("project_id", range.projectId);
    const { data: shares } = await sharesQ;
    const shareRows = (shares ?? []) as Array<{ id: string; tour_id: string; project_id: string; created_by: string | null; created_at: string; expires_at: string; revoked_at: string | null }>;
    const byShare = new Map<string, VisitRow[]>();
    for (const v of visits) byShare.set(v.share_id, [...(byShare.get(v.share_id) ?? []), v]);

    const tourIds = [...new Set(shareRows.map((s) => s.tour_id))];
    const projectIds = [...new Set(shareRows.map((s) => s.project_id))];
    const userIds = [...new Set(shareRows.map((s) => s.created_by).filter(Boolean))] as string[];
    const [{ data: tours }, { data: projects }, { data: users }] = await Promise.all([
      tourIds.length ? admin.from("project_tours").select("id, name").in("id", tourIds) : Promise.resolve({ data: [] }),
      projectIds.length ? admin.from("projects").select("id, name").in("id", projectIds) : Promise.resolve({ data: [] }),
      userIds.length ? admin.from("users").select("id, full_name").in("id", userIds) : Promise.resolve({ data: [] }),
    ]);
    const tourName = new Map(((tours ?? []) as { id: string; name: string }[]).map((t) => [t.id, t.name]));
    const projectName = new Map(((projects ?? []) as { id: string; name: string }[]).map((p) => [p.id, p.name]));
    const userName = new Map(((users ?? []) as { id: string; full_name: string | null }[]).map((u) => [u.id, u.full_name]));
    const now = Date.now();

    const links: LinkRow[] = shareRows
      .map((s) => ({
        ...linkStats(byShare.get(s.id) ?? []),
        shareId: s.id,
        tourId: s.tour_id,
        tourName: tourName.get(s.tour_id) ?? "Tour",
        projectId: s.project_id,
        projectName: projectName.get(s.project_id) ?? "Project",
        createdByName: s.created_by ? (userName.get(s.created_by) ?? null) : null,
        createdAt: s.created_at,
        expiresAt: s.expires_at,
        status: s.revoked_at ? ("revoked" as const) : new Date(s.expires_at).getTime() < now ? ("expired" as const) : ("active" as const),
      }))
      // Links with activity in the range, plus active links (even with no opens yet).
      .filter((l) => l.opens > 0 || l.previews > 0 || l.status === "active")
      .sort((a, b) => b.opens - a.opens || (b.lastOpened ?? "").localeCompare(a.lastOpened ?? ""));

    return {
      ok: true,
      totals: linkStats(visits),
      daily: dailyOpens(visits, dayRange(range.from, range.to)),
      links,
      previewSources: countBy(visits.filter((v) => v.is_preview), (v) => v.preview_source),
    };
  } catch (err) {
    return { ok: false, error: getErrorMessage(err, "Could not load link analytics.") };
  }
}

export type LinkDetailView =
  | { ok: false; error: string }
  | {
      ok: true;
      stats: LinkStats;
      daily: { date: string; opens: number; unlocked: number }[];
      devices: { label: string; count: number }[];
      countries: { label: string; count: number }[];
      referrers: { label: string; count: number }[];
      /** Null when the viewer may only see numbers. */
      viewers: { name: string; phone: string | null; email: string | null; visits: number; seconds: number; lastSeen: string }[] | null;
    };

async function buildDetail(rows: VisitRow[], range: Range, withViewers: boolean): Promise<LinkDetailView> {
  const people = rows.filter((r) => !r.is_preview);
  let viewers: Extract<LinkDetailView, { ok: true }>["viewers"] = null;
  if (withViewers) {
    const viewIds = [...new Set(people.map((r) => r.view_id).filter(Boolean))] as string[];
    const { data: views } = viewIds.length
      ? await createServiceRoleClient().from("tour_share_views").select("*").in("id", viewIds)
      : { data: [] };
    const byView = new Map(
      ((views ?? []) as Array<{ id: string; viewer_name: string; viewer_email: string | null; viewer_phone?: string | null }>).map((v) => [v.id, v])
    );
    const agg = new Map<string, { name: string; phone: string | null; email: string | null; visits: number; seconds: number; lastSeen: string }>();
    for (const r of people) {
      if (!r.view_id) continue;
      const v = byView.get(r.view_id);
      if (!v) continue;
      const key = (v.viewer_email ?? v.viewer_name).toLowerCase();
      const cur = agg.get(key) ?? { name: v.viewer_name, phone: v.viewer_phone ?? null, email: v.viewer_email, visits: 0, seconds: 0, lastSeen: r.visit_started_at };
      cur.visits += 1;
      cur.seconds += r.active_seconds;
      if (r.visit_started_at > cur.lastSeen) cur.lastSeen = r.visit_started_at;
      agg.set(key, cur);
    }
    viewers = [...agg.values()].sort((a, b) => b.lastSeen.localeCompare(a.lastSeen));
  }
  return {
    ok: true,
    stats: linkStats(rows),
    daily: dailyOpens(rows, dayRange(range.from, range.to)),
    devices: countBy(people, (r) => r.device),
    countries: countBy(people, (r) => r.country),
    referrers: countBy(people, (r) => r.referrer_host ?? "Direct / app"),
    viewers,
  };
}

export async function getLinkDetail(input: unknown): Promise<LinkDetailView> {
  const parsed = validate(rangeSchema.and(z.object({ shareId: z.string().uuid() })), input);
  if (!parsed.success) return { ok: false, error: parsed.error };
  try {
    await requireLinkStaff();
    const { data, error } = await shareVisits({ ...parsed.data, projectId: null, shareIds: [parsed.data.shareId] });
    if (error) return { ok: false, error: isMissingTable(error as never) ? MIGRATION : "Could not load the link." };
    return buildDetail(data as unknown as VisitRow[], parsed.data, true);
  } catch (err) {
    return { ok: false, error: getErrorMessage(err, "Could not load the link.") };
  }
}

/** Per tour: opens / unlocked / last opened (all time) for Tour Manager cards. */
export async function getTourLinkStats(tourIds: string[]): Promise<Record<string, { opens: number; unlocked: number; lastOpened: string | null }>> {
  try {
    if (!Array.isArray(tourIds) || tourIds.length === 0 || tourIds.length > 500) return {};
    await requireLinkStaff();
    const { data, error } = await shareVisits({ from: "2020-01-01", to: istDay(new Date().toISOString()), tourIds });
    if (error) return {};
    const byTour = new Map<string, VisitRow[]>();
    for (const v of data as unknown as VisitRow[]) if (v.tour_id) byTour.set(v.tour_id, [...(byTour.get(v.tour_id) ?? []), v]);
    const out: Record<string, { opens: number; unlocked: number; lastOpened: string | null }> = {};
    for (const [id, rows] of byTour) {
      const s = linkStats(rows);
      out[id] = { opens: s.opens, unlocked: s.unlocked, lastOpened: s.lastOpened };
    }
    return out;
  } catch {
    return {};
  }
}

/** Client engagement for one project (their own share links). Client Admin also sees viewers. */
export async function getProjectEngagement(input: unknown): Promise<LinkDetailView> {
  const parsed = validate(rangeSchema.and(z.object({ projectId: z.string().uuid() })), input);
  if (!parsed.success) return { ok: false, error: parsed.error };
  try {
    const actor = await getActiveActor();
    if (!actor || !(await canViewProject(actor, parsed.data.projectId))) throw new PublicError("You don't have access to this project.");
    const role = actor.role as UserRole;
    const { data, error } = await shareVisits(parsed.data);
    if (error) return { ok: false, error: isMissingTable(error as never) ? MIGRATION : "Could not load engagement." };
    return buildDetail(data as unknown as VisitRow[], parsed.data, isBuildViewStaffRole(role) || role === "client_admin");
  } catch (err) {
    return { ok: false, error: getErrorMessage(err, "Could not load engagement.") };
  }
}

// ---------------------------------------------------------------- website

type SiteVisitRow = {
  id: string;
  visitor_id: string;
  is_returning: boolean;
  started_at: string;
  last_seen_at: string;
  active_seconds: number;
  entry_path: string;
  exit_path: string | null;
  page_views: number;
  source: string | null;
  utm_source: string | null;
  utm_campaign: string | null;
  device: string | null;
  country: string | null;
  city: string | null;
  converted: boolean;
};

type SiteEventRow = { visit_id: string; kind: string; name: string; path: string | null; active_seconds: number; created_at: string };

export type WebsiteAnalyticsView =
  | { ok: false; error: string }
  | {
      ok: true;
      totals: { visitors: number; visits: number; pageViews: number; conversions: number; conversionRate: number | null; avgSeconds: number | null; returningShare: number | null };
      change: { visitors: number | null; visits: number | null; conversions: number | null };
      daily: { date: string; visitors: number; conversions: number }[];
      topPages: { path: string; views: number; avgSeconds: number | null }[];
      entryPages: { label: string; count: number }[];
      sources: { source: string; visits: number; conversions: number }[];
      campaigns: { campaign: string; source: string; visits: number; conversions: number }[];
      conversionsByType: { label: string; count: number }[];
      devices: { label: string; count: number }[];
      countries: { label: string; count: number }[];
      liveVisitors: number;
    };

async function siteData(from: string, to: string) {
  const admin = createServiceRoleClient();
  const visits = await fetchAllRows((a, b) =>
    admin
      .from("site_visits" as never)
      .select("*")
      .gte("started_at", istDayStartIso(from))
      .lt("started_at", endIso(to))
      .order("started_at")
      .range(a, b)
  );
  if (visits.error) return { error: visits.error, visits: [] as SiteVisitRow[], events: [] as SiteEventRow[] };
  const rows = visits.data as unknown as SiteVisitRow[];
  const ids = rows.map((r) => r.id);
  const events: SiteEventRow[] = [];
  for (let i = 0; i < ids.length; i += 300) {
    const chunk = ids.slice(i, i + 300);
    const res = await fetchAllRows((a, b) =>
      admin.from("site_events" as never).select("visit_id, kind, name, path, active_seconds, created_at").in("visit_id", chunk).order("created_at").range(a, b)
    );
    events.push(...(res.data as unknown as SiteEventRow[]));
  }
  return { error: null, visits: rows, events };
}

export async function getWebsiteAnalytics(input: unknown): Promise<WebsiteAnalyticsView> {
  const parsed = validate(rangeSchema, input);
  if (!parsed.success) return { ok: false, error: parsed.error };
  try {
    await requireStaff();
    const { from, to } = parsed.data;
    const days = dayRange(from, to);
    const span = days.length;
    const prevTo = new Date(new Date(`${from}T00:00:00Z`).getTime() - 86_400_000).toISOString().slice(0, 10);
    const prevFrom = new Date(new Date(`${prevTo}T00:00:00Z`).getTime() - (span - 1) * 86_400_000).toISOString().slice(0, 10);

    const [cur, prev] = await Promise.all([siteData(from, to), siteData(prevFrom, prevTo)]);
    if (cur.error) return { ok: false, error: isMissingTable(cur.error as never) ? MIGRATION : "Could not load website analytics." };
    const { visits, events } = cur;
    const pageViews = events.filter((e) => e.kind === "page_view");
    const conversions = events.filter((e) => e.kind === "conversion");
    const visitors = new Set(visits.map((v) => v.visitor_id)).size;
    const timed = visits.filter((v) => v.active_seconds > 0);

    const dailyMap = new Map(days.map((d) => [d, { date: d, visitors: new Set<string>(), conversions: 0 }]));
    for (const v of visits) dailyMap.get(istDay(v.started_at))?.visitors.add(v.visitor_id);
    for (const c of conversions) {
      const d = dailyMap.get(istDay(c.created_at));
      if (d) d.conversions += 1;
    }

    const pageAgg = new Map<string, { views: number; seconds: number; timed: number }>();
    for (const p of pageViews) {
      const key = p.path ?? "/";
      const a = pageAgg.get(key) ?? { views: 0, seconds: 0, timed: 0 };
      a.views += 1;
      if (p.active_seconds > 0) {
        a.seconds += p.active_seconds;
        a.timed += 1;
      }
      pageAgg.set(key, a);
    }

    const convByVisit = new Map<string, number>();
    for (const c of conversions) convByVisit.set(c.visit_id, (convByVisit.get(c.visit_id) ?? 0) + 1);
    const srcAgg = new Map<string, { visits: number; conversions: number }>();
    const campAgg = new Map<string, { campaign: string; source: string; visits: number; conversions: number }>();
    for (const v of visits) {
      const s = v.source || "Direct";
      const a = srcAgg.get(s) ?? { visits: 0, conversions: 0 };
      a.visits += 1;
      a.conversions += convByVisit.get(v.id) ?? 0;
      srcAgg.set(s, a);
      if (v.utm_campaign) {
        const k = `${v.utm_campaign}|${s}`;
        const c = campAgg.get(k) ?? { campaign: v.utm_campaign, source: s, visits: 0, conversions: 0 };
        c.visits += 1;
        c.conversions += convByVisit.get(v.id) ?? 0;
        campAgg.set(k, c);
      }
    }

    const prevVisitors = new Set(prev.visits.map((v) => v.visitor_id)).size;
    const prevConversions = prev.events.filter((e) => e.kind === "conversion").length;
    const liveSince = Date.now() - 30 * 60_000;
    const { count: live } = await createServiceRoleClient()
      .from("site_visits" as never)
      .select("id", { count: "exact", head: true })
      .gte("last_seen_at", new Date(liveSince).toISOString());

    return {
      ok: true,
      totals: {
        visitors,
        visits: visits.length,
        pageViews: pageViews.length,
        conversions: conversions.length,
        conversionRate: visits.length ? (visits.filter((v) => v.converted).length / visits.length) * 100 : null,
        avgSeconds: timed.length ? timed.reduce((s, v) => s + v.active_seconds, 0) / timed.length : null,
        returningShare: visits.length ? (visits.filter((v) => v.is_returning).length / visits.length) * 100 : null,
      },
      change: {
        visitors: percentChange(visitors, prevVisitors),
        visits: percentChange(visits.length, prev.visits.length),
        conversions: percentChange(conversions.length, prevConversions),
      },
      daily: [...dailyMap.values()].map((d) => ({ date: d.date, visitors: d.visitors.size, conversions: d.conversions })),
      topPages: [...pageAgg.entries()]
        .map(([path, a]) => ({ path, views: a.views, avgSeconds: a.timed ? a.seconds / a.timed : null }))
        .sort((a, b) => b.views - a.views)
        .slice(0, 12),
      entryPages: countBy(visits, (v) => v.entry_path, 8),
      sources: [...srcAgg.entries()].map(([source, a]) => ({ source, ...a })).sort((a, b) => b.visits - a.visits).slice(0, 12),
      campaigns: [...campAgg.values()].sort((a, b) => b.visits - a.visits).slice(0, 12),
      conversionsByType: CONVERSION_EVENTS.map((n) => ({ label: SITE_EVENT_LABELS[n] ?? n, count: conversions.filter((c) => c.name === n).length })),
      devices: countBy(visits, (v) => v.device),
      countries: countBy(visits, (v) => v.country),
      liveVisitors: live ?? 0,
    };
  } catch (err) {
    return { ok: false, error: getErrorMessage(err, "Could not load website analytics.") };
  }
}
