import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { IssueWithRelations, TimelineEventWithRelations } from "@/lib/types";
import type { TimelinePageData } from "@/lib/timeline/page-data";
import { getDemoTimelinePageData } from "@/lib/timeline/demo-timeline";
import { getAllIssues } from "@/lib/data/issues";
import { getProjects } from "@/lib/data/projects";
import { getAllReports } from "@/lib/data/reports";
import { getAllTours } from "@/lib/data/tours";

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

/** Timeline hub data scoped to projects the current user can access. */
export async function getTimelinePageData(): Promise<TimelinePageData> {
  const projects = await getProjects();
  if (projects.length === 0) {
    return { projects: [], events: [], tours: [], reports: [], issues: [] };
  }

  const projectIds = new Set(projects.map((p) => p.id));
  const [events, tours, reports, issues] = await Promise.all([
    getAllTimelineEvents(),
    getAllTours(),
    getAllReports(),
    getAllIssues(),
  ]);

  return {
    projects,
    events: events.filter((e) => projectIds.has(e.project_id)) as TimelineEventWithRelations[],
    tours: tours.filter((t) => projectIds.has(t.project_id as string)),
    reports: reports.filter((r) => projectIds.has(r.project_id as string)),
    issues: issues.filter((i) => projectIds.has(i.project_id as string)) as IssueWithRelations[],
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
