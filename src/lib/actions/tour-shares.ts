"use server";

import { createHash, randomBytes } from "crypto";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { isBuildViewStaffRole } from "@/lib/auth/roles";
import { getErrorMessage, PublicError } from "@/lib/errors/public";
import { consumeRateLimit, formatRetryAfter, getClientIp } from "@/lib/rate-limit";
import { getTourDisplayFields } from "@/lib/comparison/metadata";
import { siteConfig } from "@/lib/site-config";
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
 * Shown in the Share dialog under Viewers.
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
 * Public: record a view after the name gate. Returns Matterport URL only when
 * the share is still valid.
 */
export async function recordTourShareView(input: {
  token: string;
  name: string;
  phone: string;
  email: string;
}): Promise<
  | { ok: true; tour: TourShareUnlocked }
  | { ok: false; error: string; unavailable?: boolean }
> {
  try {
    const name = input.name?.trim() ?? "";
    if (name.length < 1 || name.length > 120) {
      return { ok: false, error: "Please enter your name." };
    }

    const phone = normalizePhone(input.phone ?? "");
    if (!isValidPhone(phone)) {
      return { ok: false, error: "Please enter a valid contact number." };
    }

    const emailRaw = input.email?.trim() ?? "";
    if (
      emailRaw.length < 3 ||
      emailRaw.length > 200 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailRaw)
    ) {
      return { ok: false, error: "Please enter a valid email address." };
    }

    const hdrs = await headers();
    const ip = getClientIp(hdrs);
    const limit = await consumeRateLimit("publicTourShareView", ip);
    if (!limit.allowed) {
      return {
        ok: false,
        error: `Too many attempts. Please wait ${formatRetryAfter(limit.retryAfterSeconds)}.`,
      };
    }

    const loaded = await loadPublicShareByToken(input.token);
    if (!loaded) {
      return { ok: false, error: "This share link is no longer available.", unavailable: true };
    }

    const admin = createServiceRoleClient();
    const { error } = await admin.from("tour_share_views").insert({
      share_id: loaded.share.id,
      viewer_name: name,
      viewer_email: emailRaw,
      viewer_phone: phone,
      user_agent: hdrs.get("user-agent")?.slice(0, 500) ?? null,
      ip_hash: hashIp(ip),
    });

    if (error) {
      console.error("[tour-shares] record view failed:", error);
      // Still unlock the tour if logging failed — don't block the recipient.
    }

    const meta = toPublicMeta(
      loaded.share.token,
      loaded.tour,
      loaded.projectName,
      loaded.projectLocation,
      loaded.share.expires_at
    );

    return {
      ok: true,
      tour: {
        ...meta,
        matterportUrl: loaded.tour.matterport_url,
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
