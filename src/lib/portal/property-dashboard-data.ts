import "server-only";

import { createClient } from "@/lib/supabase/server";
import { getProjects } from "@/lib/data/projects";
import { getToursByProjectIds } from "@/lib/data/tours";
import { getPortalWorkspaceBootstrap } from "@/lib/data/workspace";
import type { ProjectStatus, ProjectTour, PropertyDetails, PropertyUnit } from "@/lib/types";
import {
  PROPERTY_STATUS_LABELS,
  formatMonthYear,
  formatPriceRange,
} from "@/lib/property/fields";

/**
 * Real Estate Showcase data: the developer's own view of their properties
 * (not the buyer view — hidden fields still count here) plus buyer leads from
 * tour share views. Everything is read with the signed-in client's RLS.
 */

export type BuyerLead = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  viewedAt: string;
  projectId: string;
  projectName: string;
  tourName: string | null;
};

export type PropertyCardData = {
  id: string;
  name: string;
  location: string | null;
  coverUrl: string | null;
  projectStatus: ProjectStatus;
  statusLabel: string | null;
  priceLabel: string | null;
  configurations: string[];
  unitsLeft: number | null;
  possession: string | null;
  /** Latest walkthrough — needed to create a share link. */
  primaryTour: { id: string; name: string } | null;
  tourCount: number;
  leadCount: number;
  leadsThisWeek: number;
  hasDetails: boolean;
};

export type PropertyDashboardData = {
  clientName: string | null;
  stats: {
    properties: number;
    leadsThisWeek: number;
    totalLeads: number;
    activeLinks: number;
  };
  properties: PropertyCardData[];
  recentLeads: BuyerLead[];
};

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

type ShareRow = { id: string; project_id: string; tour_id: string; expires_at: string; revoked_at: string | null };
type ViewRow = {
  id: string;
  share_id: string;
  viewer_name: string;
  viewer_email: string | null;
  viewer_phone: string | null;
  created_at: string;
};

/** Buyer leads for the given projects, newest first. Missing tables read as empty. */
export async function getBuyerLeads(
  projects: { id: string; name: string }[],
  limit = 500
): Promise<{ leads: BuyerLead[]; activeLinks: number }> {
  if (projects.length === 0) return { leads: [], activeLinks: 0 };
  const supabase = await createClient();
  const projectIds = projects.map((p) => p.id);
  const projectName = new Map(projects.map((p) => [p.id, p.name]));

  const { data: shares, error: sharesError } = await supabase
    .from("tour_shares")
    .select("id, project_id, tour_id, expires_at, revoked_at")
    .in("project_id", projectIds);
  if (sharesError || !shares?.length) return { leads: [], activeLinks: 0 };

  const shareRows = shares as ShareRow[];
  const now = Date.now();
  const activeLinks = shareRows.filter(
    (s) => !s.revoked_at && new Date(s.expires_at).getTime() > now
  ).length;

  const shareById = new Map(shareRows.map((s) => [s.id, s]));
  const tourIds = Array.from(new Set(shareRows.map((s) => s.tour_id)));

  const [{ data: views }, { data: tours }] = await Promise.all([
    supabase
      .from("tour_share_views")
      .select("id, share_id, viewer_name, viewer_email, viewer_phone, created_at")
      .in("share_id", shareRows.map((s) => s.id))
      .order("created_at", { ascending: false })
      .limit(limit),
    supabase.from("project_tours").select("id, name").in("id", tourIds),
  ]);
  const tourName = new Map((tours ?? []).map((t) => [t.id as string, t.name as string]));

  const leads = ((views ?? []) as ViewRow[]).flatMap((view) => {
    const share = shareById.get(view.share_id);
    if (!share) return [];
    return [
      {
        id: view.id,
        name: view.viewer_name.trim(),
        phone: view.viewer_phone?.trim() || null,
        email: view.viewer_email?.trim() || null,
        viewedAt: view.created_at,
        projectId: share.project_id,
        projectName: projectName.get(share.project_id) ?? "Property",
        tourName: tourName.get(share.tour_id) ?? null,
      },
    ];
  });

  return { leads, activeLinks };
}

export async function getPropertyDashboardData(): Promise<PropertyDashboardData> {
  const [bootstrap, projects] = await Promise.all([getPortalWorkspaceBootstrap(), getProjects()]);
  const projectIds = projects.map((p) => p.id);
  const supabase = await createClient();

  const [toursRaw, detailsRes, unitsRes, leadsResult] = await Promise.all([
    getToursByProjectIds(projectIds),
    supabase.from("property_details").select("*").in("project_id", projectIds.length ? projectIds : ["00000000-0000-0000-0000-000000000000"]),
    supabase
      .from("property_units")
      .select("*")
      .in("project_id", projectIds.length ? projectIds : ["00000000-0000-0000-0000-000000000000"])
      .order("sort_order"),
    getBuyerLeads(projects.map((p) => ({ id: p.id, name: p.name }))),
  ]);

  const detailsByProject = new Map(
    ((detailsRes.error ? [] : detailsRes.data) as PropertyDetails[]).map((d) => [d.project_id, d])
  );
  const unitsByProject = new Map<string, PropertyUnit[]>();
  for (const unit of (unitsRes.error ? [] : unitsRes.data) as PropertyUnit[]) {
    const list = unitsByProject.get(unit.project_id) ?? [];
    list.push(unit);
    unitsByProject.set(unit.project_id, list);
  }

  const toursByProject = new Map<string, ProjectTour[]>();
  for (const tour of (toursRaw ?? []) as ProjectTour[]) {
    const list = toursByProject.get(tour.project_id) ?? [];
    list.push(tour);
    toursByProject.set(tour.project_id, list);
  }

  const weekAgo = Date.now() - WEEK_MS;
  const leads = leadsResult.leads;
  const isRecent = (lead: BuyerLead) => new Date(lead.viewedAt).getTime() >= weekAgo;

  const properties: PropertyCardData[] = projects.map((project) => {
    const details = detailsByProject.get(project.id) ?? null;
    const units = unitsByProject.get(project.id) ?? [];
    const tours = [...(toursByProject.get(project.id) ?? [])].sort(
      (a, b) =>
        new Date(b.capture_date ?? b.created_at).getTime() -
        new Date(a.capture_date ?? a.created_at).getTime()
    );
    const configurations = Array.from(
      new Set(units.map((u) => u.configuration?.trim()).filter((c): c is string => Boolean(c)))
    );
    const unitsWithCount = units.filter((u) => u.units_available != null);
    const projectLeads = leads.filter((l) => l.projectId === project.id);
    const priceMode = details?.price_mode ?? "show";

    return {
      id: project.id,
      name: project.name,
      location: project.location?.trim() || null,
      coverUrl: project.cover_image_url || tours[0]?.thumbnail_url || null,
      projectStatus: project.status,
      statusLabel: details?.property_status ? PROPERTY_STATUS_LABELS[details.property_status] : null,
      priceLabel:
        priceMode === "on_request"
          ? "Price on request"
          : priceMode === "hide"
            ? null
            : formatPriceRange(details?.price_min ?? null, details?.price_max ?? null),
      configurations,
      unitsLeft: unitsWithCount.length
        ? unitsWithCount.reduce((sum, u) => sum + (u.units_available ?? 0), 0)
        : null,
      possession: formatMonthYear(details?.possession_date),
      primaryTour: tours[0] ? { id: tours[0].id, name: tours[0].name } : null,
      tourCount: tours.length,
      leadCount: projectLeads.length,
      leadsThisWeek: projectLeads.filter(isRecent).length,
      hasDetails: Boolean(details) || units.length > 0,
    };
  });

  // Busiest properties first, then newest.
  properties.sort(
    (a, b) => b.leadsThisWeek - a.leadsThisWeek || b.leadCount - a.leadCount || a.name.localeCompare(b.name)
  );

  return {
    clientName: bootstrap.clientName,
    stats: {
      properties: properties.length,
      leadsThisWeek: leads.filter(isRecent).length,
      totalLeads: leads.length,
      activeLinks: leadsResult.activeLinks,
    },
    properties,
    recentLeads: leads.slice(0, 6),
  };
}
