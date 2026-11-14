import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { IssueWithRelations, TimelineEventWithRelations } from "@/lib/types";
import type { TimelinePageData } from "@/lib/timeline/page-data";
import { getDemoTimelinePageData } from "@/lib/timeline/demo-timeline";
import { idsOrNone } from "@/lib/data/query";
import { getIssuesByProjectIds } from "@/lib/data/issues";
import { getProjects } from "@/lib/data/projects";
import { getReportsByProjectIds } from "@/lib/data/reports";
import { getToursByProjectIds } from "@/lib/data/tours";

export async function getAllTimelineEvents() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("timeline_events")
    .select(
      "*, project:projects(name), timeline_photos(*), tour:project_tours(*), report:reports(*)"
    )
    .is("deleted_at", null)
    .order("event_date", { ascending: true })
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  return (data || []).map((event) => ({
    ...event,
    timeline_photos:
      event.timeline_photos?.filter(
        (photo: { deleted_at: string | null }) => !photo.deleted_at
      ) ?? [],
  }));
}

export async function getTimelineEventsByProjectIds(projectIds: string[]) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("timeline_events")
    .select(
      "*, project:projects(name), timeline_photos(*), tour:project_tours(*), report:reports(*)"
    )
    .in("project_id", idsOrNone(projectIds))
    .is("deleted_at", null)
    .order("event_date", { ascending: true })
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  return (data || []).map((event) => ({
    ...event,
    timeline_photos:
      event.timeline_photos?.filter(
        (photo: { deleted_at: string | null }) => !photo.deleted_at
      ) ?? [],
  }));
}

/** Timeline hub data scoped to projects the current user can access. */
export async function getTimelinePageData(): Promise<TimelinePageData> {
  const projects = await getProjects();
  if (projects.length === 0) {
    return { projects: [], events: [], tours: [], reports: [], issues: [] };
  }

  const projectIds = projects.map((p) => p.id);
  const [events, tours, reports, issues] = await Promise.all([
    getTimelineEventsByProjectIds(projectIds),
    getToursByProjectIds(projectIds),
    getReportsByProjectIds(projectIds),
    getIssuesByProjectIds(projectIds),
  ]);

  return {
    projects,
    events: events as TimelineEventWithRelations[],
    tours,
    reports,
    issues: issues as IssueWithRelations[],
  };
}

/** Client portal timeline — falls back to demo preview when no projects are assigned. */
export async function getClientTimelinePageData(): Promise<{
  data: TimelinePageData;
  isDemo: boolean;
}> {
  const data = await getTimelinePageData();
  if (data.projects.length === 0) {
    return { data: getDemoTimelinePageData(), isDemo: true };
  }
  return { data, isDemo: false };
}
