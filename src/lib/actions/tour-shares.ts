"use server";

import { createHash, randomBytes } from "crypto";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { loadBuyerProperty } from "@/lib/property/load";
import { hasPropertyContent, type BuyerProperty } from "@/lib/property/buyer-view";
import { isBuildViewStaffRole } from "@/lib/auth/roles";
import { requireStaffPermission } from "@/lib/auth/staff";
import { getErrorMessage, PublicError } from "@/lib/errors/public";
import { consumeRateLimit, formatRetryAfter, getClientIp } from "@/lib/rate-limit";
import { getTourDisplayFields } from "@/lib/comparison/metadata";
import { siteConfig } from "@/lib/site-config";
import {
  normalizeViewerEmail,
  shouldSkipDuplicateView,
  VIEW_DEDUPE_WINDOW_MS,
} from "@/lib/tour-shares/view-dedupe";
import {
  buildTourViewerNotifyCopy,
  shouldNotifyNewTourViewer,
} from "@/lib/tour-shares/viewer-notify-policy";
import { notifyTourViewerStaffIfEnabled } from "@/lib/notifications/server";
import type { ProjectTour, TourShare, UserRole } from "@/lib/types";

const SHARE_TTL_MS = 10 * 24 * 60 * 60 * 1000;
const TOKEN_BYTES = 24;

export type TourSharePublicMeta = {
  token: string;
  projectName: string;
  projectLocation: string | null;
  tourName: string;
  captureDate: string | null;
  building: string | null;
  floor: string | null;
  expiresAt: string;
};

export type TourShareUnlocked = TourSharePublicMeta & {
  matterportUrl: string;
  /** Buyer-facing property page (portfolio projects with property details). */
  property: BuyerProperty | null;
};

export type TourShareSummary = {
  id: string;
  token: string;
  url: string;
  expiresAt: string;
  createdAt: string;
  revokedAt: string | null;
  isActive: boolean;
  viewCount: number;
};

export type TourShareViewerRow = {
  id: string;
  viewerName: string;
  viewerEmail: string | null;
  viewerPhone: string | null;
  createdAt: string;
};

/** Full lead row for the superadmin Tour Viewers dashboard. */
export type TourShareViewerAdminRow = TourShareViewerRow & {
  projectId: string;
  projectName: string;
  /** Client organization via projects.client_id → clients.name (name only). */
  clientName: string | null;
  tourId: string;
  tourName: string;
  shareId: string;
  shareExpiresAt: string;
  shareRevokedAt: string | null;
};

function normalizePhone(raw: string): string {
  return raw.trim().replace(/\s+/g, " ");
}

function isValidPhone(phone: string): boolean {
  const digits = phone.replace(/\D/g, "");
  return digits.length >= 7 && digits.length <= 15 && phone.length <= 40;
}

function shareUrl(token: string): string {
  const base = siteConfig.url.replace(/\/$/, "");
  return `${base}/share/tours/${token}`;
}

function newToken(): string {
  return randomBytes(TOKEN_BYTES).toString("base64url");
}

function hashIp(ip: string): string {
  return createHash("sha256").update(ip.trim().toLowerCase()).digest("hex").slice(0, 32);
}

function isShareActive(share: Pick<TourShare, "expires_at" | "revoked_at">, now = Date.now()): boolean {
  if (share.revoked_at) return false;
  return new Date(share.expires_at).getTime() > now;
}

async function assertCanShareTour(tourId: string): Promise<{
  userId: string;
  tour: ProjectTour;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new PublicError("You must be signed in to share a tour.");

  const { data: profile } = await supabase
    .from("users")
    .select("role, is_active")
    .eq("id", user.id)
    .is("deleted_at", null)
    .maybeSingle();

  if (!profile?.is_active) throw new PublicError("Your account is inactive.");

  const admin = createServiceRoleClient();
  const { data: tour, error } = await admin
    .from("project_tours")
    .select("*")
    .eq("id", tourId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error || !tour) throw new PublicError("Tour not found.");

  if (isBuildViewStaffRole(profile.role as UserRole)) {
    return { userId: user.id, tour: tour as ProjectTour };
  }

  const { data: accessible } = await supabase
    .from("project_tours")
    .select("id")
    .eq("id", tourId)
    .is("deleted_at", null)
    .maybeSingle();

  if (!accessible) throw new PublicError("You do not have access to this tour.");

  return { userId: user.id, tour: tour as ProjectTour };
}

async function loadPublicShareByToken(token: string): Promise<{
  share: TourShare;
  tour: ProjectTour;
  projectName: string;
  projectLocation: string | null;
} | null> {
  const trimmed = token.trim();
  if (trimmed.length < 24) return null;

  const admin = createServiceRoleClient();
  const { data: share } = await admin
    .from("tour_shares")
    .select("*")
    .eq("token", trimmed)
    .maybeSingle();

  if (!share || !isShareActive(share as TourShare)) return null;

  const { data: tour } = await admin
    .from("project_tours")
    .select("*")
    .eq("id", share.tour_id)
    .is("deleted_at", null)
    .maybeSingle();

  if (!tour) return null;

  const { data: project } = await admin
    .from("projects")
    .select("name, location")
    .eq("id", share.project_id)
    .is("deleted_at", null)
    .maybeSingle();

  if (!project) return null;

  return {
    share: share as TourShare,
    tour: tour as ProjectTour,
    projectName: project.name,
    projectLocation: project.location ?? null,
  };
}

function toPublicMeta(
  token: string,
  tour: ProjectTour,
  projectName: string,
  projectLocation: string | null,
  expiresAt: string
): TourSharePublicMeta {
  const fields = getTourDisplayFields(tour);
  return {
    token,
    projectName,
    projectLocation,
    tourName: tour.name,
    captureDate: tour.capture_date,
    building: fields.building,
    floor: fields.floor,
    expiresAt,
  };
}

/** Safe fields for the public page (no Matterport URL). */
export async function getTourSharePublicMeta(
  token: string
): Promise<{ ok: true; meta: TourSharePublicMeta } | { ok: false; reason: "unavailable" }> {
  try {
    const loaded = await loadPublicShareByToken(token);
    if (!loaded) return { ok: false, reason: "unavailable" };
    return {
      ok: true,
      meta: toPublicMeta(
        loaded.share.token,
        loaded.tour,
        loaded.projectName,
        loaded.projectLocation,
        loaded.share.expires_at
      ),
    };
  } catch {
    return { ok: false, reason: "unavailable" };
  }
}

/**
 * Create a share link (or reuse an active non-expired one for this tour).
 * Expires 10 days from creation.
 */
export async function createTourShare(
  tourId: string
): Promise<{ ok: true; share: TourShareSummary } | { ok: false; error: string }> {
  try {
    const { userId, tour } = await assertCanShareTour(tourId);
    const admin = createServiceRoleClient();
    const now = Date.now();

    const { data: existing } = await admin
      .from("tour_shares")
      .select("*")
      .eq("tour_id", tour.id)
      .is("revoked_at", null)
      .gt("expires_at", new Date(now).toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existing && isShareActive(existing as TourShare, now)) {
      const viewCount = await countViews(existing.id);
      return {
        ok: true,
        share: toSummary(existing as TourShare, viewCount),
      };
    }

    const expiresAt = new Date(now + SHARE_TTL_MS).toISOString();
    const token = newToken();

    const { data: created, error } = await admin
      .from("tour_shares")
      .insert({
        tour_id: tour.id,
        project_id: tour.project_id,
        token,
        created_by: userId,
        expires_at: expiresAt,
      })
      .select("*")
      .single();

    if (error || !created) {
      console.error("[tour-shares] create failed:", error);
      throw new PublicError("Could not create share link. Please try again.");
    }

    return { ok: true, share: toSummary(created as TourShare, 0) };
  } catch (err) {
    return { ok: false, error: getErrorMessage(err, "Could not create share link.") };
  }
}

export async function revokeTourShare(
  shareId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new PublicError("You must be signed in.");

    const admin = createServiceRoleClient();
    const { data: share } = await admin
      .from("tour_shares")
      .select("*")
      .eq("id", shareId)
      .maybeSingle();

    if (!share) throw new PublicError("Share link not found.");

    await assertCanShareTour(share.tour_id);

    const { error } = await admin
      .from("tour_shares")
      .update({ revoked_at: new Date().toISOString() })
      .eq("id", shareId)
      .is("revoked_at", null);

    if (error) {
      console.error("[tour-shares] revoke failed:", error);
      throw new PublicError("Could not revoke share link.");
    }

    return { ok: true };
  } catch (err) {
    return { ok: false, error: getErrorMessage(err, "Could not revoke share link.") };
  }
}

/**
 * All people who opened any share link for this tour (current + past links).
 */
export async function getTourShareViewers(
  tourId: string
): Promise<{ ok: true; viewers: TourShareViewerRow[] } | { ok: false; error: string }> {
  try {
    await assertCanShareTour(tourId);
    const admin = createServiceRoleClient();

    const { data: shares, error: sharesError } = await admin
      .from("tour_shares")
      .select("id")
      .eq("tour_id", tourId);

    if (sharesError) {
      console.error("[tour-shares] list share ids failed:", sharesError);
      throw new PublicError("Could not load viewers.");
    }

    const shareIds = (shares ?? []).map((s) => s.id);
    if (shareIds.length === 0) {
      return { ok: true, viewers: [] };
    }

    const { data: rows, error } = await admin
      .from("tour_share_views")
      .select("id, viewer_name, viewer_email, viewer_phone, created_at")
      .in("share_id", shareIds)
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) {
      console.error("[tour-shares] list viewers failed:", error);
      throw new PublicError("Could not load viewers.");
    }

    return {
      ok: true,
      viewers: (rows ?? []).map((r) => ({
        id: r.id,
        viewerName: r.viewer_name,
        viewerEmail: r.viewer_email,
        viewerPhone: r.viewer_phone ?? null,
        createdAt: r.created_at,
      })),
    };
  } catch (err) {
    return { ok: false, error: getErrorMessage(err, "Could not load viewers.") };
  }
}

/**
 * Superadmin dashboard: every shared-tour viewer with name, phone, email,
 * and project/tour context.
 */
export async function listAllTourShareViewers(options?: {
  query?: string | null;
  projectId?: string | null;
  limit?: number;
}): Promise<TourShareViewerAdminRow[]> {
  await requireStaffPermission("read", "tour_viewers");
  const admin = createServiceRoleClient();
  const limit = Math.min(Math.max(options?.limit ?? 500, 1), 1000);

  let sharesQuery = admin
    .from("tour_shares")
    .select("id, tour_id, project_id, expires_at, revoked_at");

  if (options?.projectId) {
    sharesQuery = sharesQuery.eq("project_id", options.projectId);
  }

  const { data: shares, error: sharesError } = await sharesQuery;
  if (sharesError) {
    console.error("[tour-shares] admin list shares failed:", sharesError);
    throw new PublicError("Could not load tour viewers.");
  }
  if (!shares?.length) return [];

  const shareIds = shares.map((s) => s.id);
  const shareById = new Map(shares.map((s) => [s.id, s]));

  const { data: views, error: viewsError } = await admin
    .from("tour_share_views")
    .select("id, share_id, viewer_name, viewer_email, viewer_phone, created_at")
    .in("share_id", shareIds)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (viewsError) {
    console.error("[tour-shares] admin list views failed:", viewsError);
    throw new PublicError("Could not load tour viewers.");
  }
  if (!views?.length) return [];

  const tourIds = [...new Set(shares.map((s) => s.tour_id))];
  const projectIds = [...new Set(shares.map((s) => s.project_id))];

  const [{ data: tours }, { data: projects }] = await Promise.all([
    admin.from("project_tours").select("id, name").in("id", tourIds),
    admin.from("projects").select("id, name, client_id").in("id", projectIds),
  ]);

  const tourNameById = new Map((tours ?? []).map((t) => [t.id, t.name]));
  const projectById = new Map(
    (projects ?? []).map((p) => [
      p.id,
      { name: p.name, clientId: p.client_id as string | null },
    ])
  );

  const clientIds = [
    ...new Set(
      [...projectById.values()]
        .map((p) => p.clientId)
        .filter((id): id is string => Boolean(id))
    ),
  ];
  const clientNameById = new Map<string, string>();
  if (clientIds.length > 0) {
    const { data: clients } = await admin
      .from("clients")
      .select("id, name, company_name")
      .in("id", clientIds);
    for (const c of clients ?? []) {
      // Organization display only — prefer company_name when set (same as workspace).
      const label =
        (typeof c.company_name === "string" && c.company_name.trim()) ||
        c.name;
      clientNameById.set(c.id, label);
    }
  }

  const q = options?.query?.trim().toLowerCase() || null;

  const rows: TourShareViewerAdminRow[] = [];
  for (const view of views) {
    const share = shareById.get(view.share_id);
    if (!share) continue;
    const project = projectById.get(share.project_id);
    const clientName = project?.clientId
      ? (clientNameById.get(project.clientId) ?? null)
      : null;
    const row: TourShareViewerAdminRow = {
      id: view.id,
      viewerName: view.viewer_name,
      viewerEmail: view.viewer_email,
      viewerPhone: view.viewer_phone ?? null,
      createdAt: view.created_at,
      projectId: share.project_id,
      projectName: project?.name ?? "Project",
      clientName,
      tourId: share.tour_id,
      tourName: tourNameById.get(share.tour_id) ?? "Tour",
      shareId: share.id,
      shareExpiresAt: share.expires_at,
      shareRevokedAt: share.revoked_at,
    };
    if (q) {
      const hay = [
        row.viewerName,
        row.viewerPhone ?? "",
        row.viewerEmail ?? "",
        row.projectName,
        row.clientName ?? "",
        row.tourName,
      ]
        .join(" ")
        .toLowerCase();
      if (!hay.includes(q)) continue;
    }
    rows.push(row);
  }

  return rows;
}

/** Get active share for a tour without creating one. */
export async function getActiveTourShare(
  tourId: string
): Promise<{ ok: true; share: TourShareSummary | null } | { ok: false; error: string }> {
  try {
    await assertCanShareTour(tourId);
    const admin = createServiceRoleClient();
    const { data: existing } = await admin
      .from("tour_shares")
      .select("*")
      .eq("tour_id", tourId)
      .is("revoked_at", null)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!existing) return { ok: true, share: null };
    const viewCount = await countViews(existing.id);
    return { ok: true, share: toSummary(existing as TourShare, viewCount) };
  } catch (err) {
    return { ok: false, error: getErrorMessage(err, "Could not load share link.") };
  }
}

/**
 * Public: unlock a shared tour after the access gate (or restore a prior unlock).
 * Returns the Matterport URL only when the share is still valid.
 *
 * `recordView` (default true): when false, validates the share and returns the
 * unlock payload without inserting a tour_share_views row (session restore /
 * reload of an already-unlocked tour).
 *
 * When recording: skips insert if the same share_id + normalized email already
 * has a view within VIEW_DEDUPE_WINDOW_MS (24h). Distinct emails, or the same
 * email after the window, still create new rows. Rate limit applies only when
 * recording.
 */
export async function recordTourShareView(input: {
  token: string;
  name: string;
  phone: string;
  email: string;
  /** When false, unlock only — no insert (session restore). Default true. */
  recordView?: boolean;
}): Promise<
  | { ok: true; tour: TourShareUnlocked; viewRecorded: boolean }
  | { ok: false; error: string; unavailable?: boolean }
> {
  try {
    const shouldRecord = input.recordView !== false;

    const name = input.name?.trim() ?? "";
    if (name.length < 1 || name.length > 120) {
      return { ok: false, error: "Please enter your name." };
    }

    const phone = normalizePhone(input.phone ?? "");
    if (!isValidPhone(phone)) {
      return { ok: false, error: "Please enter a valid contact number." };
    }

    const email = normalizeViewerEmail(input.email ?? "");
    if (
      email.length < 3 ||
      email.length > 200 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ) {
      return { ok: false, error: "Please enter a valid email address." };
    }

    const hdrs = await headers();
    const ip = getClientIp(hdrs);

    if (shouldRecord) {
      const limit = await consumeRateLimit("publicTourShareView", ip);
      if (!limit.allowed) {
        return {
          ok: false,
          error: `Too many attempts. Please wait ${formatRetryAfter(limit.retryAfterSeconds)}.`,
        };
      }
    }

    const loaded = await loadPublicShareByToken(input.token);
    if (!loaded) {
      return { ok: false, error: "This share link is no longer available.", unavailable: true };
    }

    let viewRecorded = false;

    if (shouldRecord) {
      const admin = createServiceRoleClient();
      const sinceIso = new Date(Date.now() - VIEW_DEDUPE_WINDOW_MS).toISOString();

      // App-level dedupe (indexes today: share_id + created_at only).
      // Concurrent double-submit can still race without a DB unique index —
      // a forever-unique (share_id, email) constraint would incorrectly merge
      // legitimate revisits after the 24h window, so none is applied here.
      const { data: recentViews, error: recentErr } = await admin
        .from("tour_share_views")
        .select("id, viewer_email, created_at")
        .eq("share_id", loaded.share.id)
        .gte("created_at", sinceIso)
        .order("created_at", { ascending: false })
        .limit(50);

      if (recentErr) {
        console.error("[tour-shares] dedupe lookup failed:", recentErr);
      }

      const existing = (recentViews ?? []).find(
        (row) =>
          row.viewer_email != null &&
          normalizeViewerEmail(row.viewer_email) === email &&
          shouldSkipDuplicateView({ existingCreatedAt: row.created_at })
      );

      if (!existing) {
        const { error } = await admin.from("tour_share_views").insert({
          share_id: loaded.share.id,
          viewer_name: name,
          viewer_email: email,
          viewer_phone: phone,
          user_agent: hdrs.get("user-agent")?.slice(0, 500) ?? null,
          ip_hash: hashIp(ip),
        });

        if (error) {
          console.error("[tour-shares] record view failed:", error);
          // Still unlock the tour if logging failed — don't block the recipient.
        } else {
          viewRecorded = true;
        }
      }
    }

    // Staff notify only for a successful new insert. Failures / dedupe / restore
    // must not alert. Notification errors must never block tour unlock.
    if (shouldNotifyNewTourViewer({ viewRecorded })) {
      try {
        const copy = buildTourViewerNotifyCopy({
          viewerName: name,
          projectName: loaded.projectName,
          tourName: loaded.tour.name,
        });
        await notifyTourViewerStaffIfEnabled({
          title: copy.title,
          message: copy.message,
          type: "info",
          link: copy.link,
        });
      } catch (notifyErr) {
        console.error("[tour-shares] staff notify failed:", notifyErr);
      }
    }

    const meta = toPublicMeta(
      loaded.share.token,
      loaded.tour,
      loaded.projectName,
      loaded.projectLocation,
      loaded.share.expires_at
    );

    // Hidden/empty fields are stripped server-side; never blocks the tour unlock.
    const property = await loadBuyerProperty(createServiceRoleClient(), loaded.share.project_id)
      .then((view) => (view && hasPropertyContent(view) ? view : null))
      .catch((propertyErr) => {
        console.error("[tour-shares] property load failed:", propertyErr);
        return null;
      });

    return {
      ok: true,
      viewRecorded,
      tour: {
        ...meta,
        matterportUrl: loaded.tour.matterport_url,
        property,
      },
    };
  } catch (err) {
    return {
      ok: false,
      error: getErrorMessage(err, "Could not open this tour. Please try again."),
    };
  }
}

async function countViews(shareId: string): Promise<number> {
  const admin = createServiceRoleClient();
  const { count } = await admin
    .from("tour_share_views")
    .select("id", { count: "exact", head: true })
    .eq("share_id", shareId);
  return count ?? 0;
}

function toSummary(share: TourShare, viewCount: number): TourShareSummary {
  return {
    id: share.id,
    token: share.token,
    url: shareUrl(share.token),
    expiresAt: share.expires_at,
    createdAt: share.created_at,
    revokedAt: share.revoked_at,
    isActive: isShareActive(share),
    viewCount,
  };
}
