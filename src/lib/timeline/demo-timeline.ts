import type { TimelinePageData } from "@/lib/timeline/page-data";
import type {
  IssueWithRelations,
  Project,
  ProjectTour,
  Report,
  TimelineEventWithRelations,
} from "@/lib/types";

const DEMO_PROJECT_ID = "demo-timeline-project";
const DEMO_CLIENT_ID = "demo-client";
const DEMO_MATTERPORT = "https://my.matterport.com/show/?m=SxQL3iGyoDo";
const CONSTRUCTION_THUMB =
  "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=400&h=300&fit=crop";

const audit = {
  created_by: null,
  updated_by: null,
  deleted_at: null,
  deleted_by: null,
};

function recentMonth(offset: number): { year: number; month: number; date: string; iso: string } {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - offset);
  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  const date = monthDate(year, month, 1);
  return { year, month, date, iso: d.toISOString() };
}

function tourMeta(building: string, floor: string, engineer = "Raj Engineer") {
  return JSON.stringify({ building, floor, engineer });
}

function monthDate(year: number, month: number, day = 1): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** Sample timeline data for the client portal when no projects are assigned yet. */
export function getDemoTimelinePageData(): TimelinePageData {
  const now = new Date();
  const m0 = recentMonth(0);
  const m1 = recentMonth(1);
  const m2 = recentMonth(2);
  const m3 = recentMonth(3);
  const m4 = recentMonth(4);

  const project: Project = {
    id: DEMO_PROJECT_ID,
    name: "Green Heights Tower",
    client_id: DEMO_CLIENT_ID,
    client_name: "DM Creatives",
    location: "Mumbai, India",
    description: "32-story residential tower with retail podium.",
    status: "in_progress",
    start_date: "2024-06-01",
    completion_date: "2026-12-31",
    cover_image_url: CONSTRUCTION_THUMB,
    created_at: "2024-06-01T00:00:00Z",
    updated_at: now.toISOString(),
    ...audit,
  };

  const tours: Array<ProjectTour & { project?: { name: string } | null }> = [
    {
      id: "demo-tour-m0",
      project_id: DEMO_PROJECT_ID,
      name: "Level 8 — Current Scan",
      matterport_url: DEMO_MATTERPORT,
      capture_date: monthDate(m0.year, m0.month, 28),
      description: tourMeta("Tower A", "Level 8"),
      thumbnail_url: CONSTRUCTION_THUMB,
      sort_order: 0,
      created_at: monthDate(m0.year, m0.month, 28) + "T10:00:00Z",
      updated_at: monthDate(m0.year, m0.month, 28) + "T10:00:00Z",
      ...audit,
      project: { name: project.name },
    },
    {
      id: "demo-tour-m1",
      project_id: DEMO_PROJECT_ID,
      name: "Level 7 — Prior Scan",
      matterport_url: DEMO_MATTERPORT,
      capture_date: monthDate(m1.year, m1.month, 25),
      description: tourMeta("Tower A", "Level 7"),
      thumbnail_url: CONSTRUCTION_THUMB,
      sort_order: 1,
      created_at: monthDate(m1.year, m1.month, 25) + "T10:00:00Z",
      updated_at: monthDate(m1.year, m1.month, 25) + "T10:00:00Z",
      ...audit,
      project: { name: project.name },
    },
    {
      id: "demo-tour-m2",
      project_id: DEMO_PROJECT_ID,
      name: "Level 6 — Scan",
      matterport_url: DEMO_MATTERPORT,
      capture_date: monthDate(m2.year, m2.month, 22),
      description: tourMeta("Tower A", "Level 6"),
      thumbnail_url: CONSTRUCTION_THUMB,
      sort_order: 2,
      created_at: monthDate(m2.year, m2.month, 22) + "T10:00:00Z",
      updated_at: monthDate(m2.year, m2.month, 22) + "T10:00:00Z",
      ...audit,
      project: { name: project.name },
    },
    {
      id: "demo-tour-m3",
      project_id: DEMO_PROJECT_ID,
      name: "Level 5 — Scan",
      matterport_url: DEMO_MATTERPORT,
      capture_date: monthDate(m3.year, m3.month, 20),
      description: tourMeta("Tower A", "Level 5"),
      thumbnail_url: CONSTRUCTION_THUMB,
      sort_order: 3,
      created_at: monthDate(m3.year, m3.month, 20) + "T10:00:00Z",
      updated_at: monthDate(m3.year, m3.month, 20) + "T10:00:00Z",
      ...audit,
      project: { name: project.name },
    },
    {
      id: "demo-tour-m4",
      project_id: DEMO_PROJECT_ID,
      name: "Level 4 — Scan",
      matterport_url: DEMO_MATTERPORT,
      capture_date: monthDate(m4.year, m4.month, 18),
      description: tourMeta("Tower A", "Level 4"),
      thumbnail_url: CONSTRUCTION_THUMB,
      sort_order: 4,
      created_at: monthDate(m4.year, m4.month, 18) + "T10:00:00Z",
      updated_at: monthDate(m4.year, m4.month, 18) + "T10:00:00Z",
      ...audit,
      project: { name: project.name },
    },
  ];

  const reports: Array<Report & { project?: { name: string } | null }> = [
    {
      id: "demo-report-m0",
      project_id: DEMO_PROJECT_ID,
      title: "Monthly Progress Report",
      report_type: "progress_report",
      report_date: monthDate(m0.year, m0.month, 30),
      description: null,
      file_url: "#",
      file_name: "progress-report.pdf",
      file_size: 2400000,
      mime_type: "application/pdf",
      storage_path: null,
      created_at: monthDate(m0.year, m0.month, 30) + "T00:00:00Z",
      updated_at: monthDate(m0.year, m0.month, 30) + "T00:00:00Z",
      ...audit,
      project: { name: project.name },
    },
    {
      id: "demo-report-m1",
      project_id: DEMO_PROJECT_ID,
      title: "Monthly Progress Report",
      report_type: "progress_report",
      report_date: monthDate(m1.year, m1.month, 28),
      description: null,
      file_url: "#",
      file_name: "progress-report.pdf",
      file_size: 2100000,
      mime_type: "application/pdf",
      storage_path: null,
      created_at: monthDate(m1.year, m1.month, 28) + "T00:00:00Z",
      updated_at: monthDate(m1.year, m1.month, 28) + "T00:00:00Z",
      ...audit,
      project: { name: project.name },
    },
  ];

  const events: TimelineEventWithRelations[] = [
    {
      id: "demo-event-m0",
      project_id: DEMO_PROJECT_ID,
      title: "Level 8 slab completed",
      event_date: monthDate(m0.year, m0.month, 15),
      progress_note:
        "Structural work advanced on Tower A. Level 8 slab pour completed. Masonry work progressing on levels 5–7. Electrical rough-in underway on the east wing.",
      tour_id: "demo-tour-m0",
      report_id: "demo-report-m0",
      sort_order: 0,
      created_at: monthDate(m0.year, m0.month, 15) + "T00:00:00Z",
      updated_at: monthDate(m0.year, m0.month, 15) + "T00:00:00Z",
      ...audit,
      timeline_photos: [
        {
          id: "demo-photo-m0",
          timeline_event_id: "demo-event-m0",
          image_url: CONSTRUCTION_THUMB,
          storage_path: null,
          caption: "Level 8 slab",
          sort_order: 0,
          created_at: monthDate(m0.year, m0.month, 15) + "T00:00:00Z",
          updated_at: monthDate(m0.year, m0.month, 15) + "T00:00:00Z",
          ...audit,
        },
      ],
      tour: tours[0],
      report: reports[0],
    },
    {
      id: "demo-event-m1",
      project_id: DEMO_PROJECT_ID,
      title: "Level 7 structural milestone",
      event_date: monthDate(m1.year, m1.month, 12),
      progress_note:
        "Level 7 columns and beams completed. MEP coordination review held with subcontractors.",
      tour_id: "demo-tour-m1",
      report_id: "demo-report-m1",
      sort_order: 0,
      created_at: monthDate(m1.year, m1.month, 12) + "T00:00:00Z",
      updated_at: monthDate(m1.year, m1.month, 12) + "T00:00:00Z",
      ...audit,
      timeline_photos: [],
      tour: tours[1],
      report: reports[1],
    },
    {
      id: "demo-event-m2",
      project_id: DEMO_PROJECT_ID,
      title: "Facade mock-up approved",
      event_date: monthDate(m2.year, m2.month, 10),
      progress_note: "Facade mock-up approved by client. Level 6 slab completed.",
      tour_id: "demo-tour-m2",
      report_id: null,
      sort_order: 0,
      created_at: monthDate(m2.year, m2.month, 10) + "T00:00:00Z",
      updated_at: monthDate(m2.year, m2.month, 10) + "T00:00:00Z",
      ...audit,
      timeline_photos: [],
      tour: tours[2],
      report: null,
    },
  ];

  const issues: IssueWithRelations[] = [
    {
      id: "demo-issue-1",
      project_id: DEMO_PROJECT_ID,
      title: "Rebar spacing deviation — Level 8",
      description: null,
      priority: "high",
      status: "open",
      location: "Tower A, Level 8",
      assigned_to: null,
      due_date: null,
      resolved_at: null,
      created_at: monthDate(m0.year, m0.month, 20) + "T00:00:00Z",
      updated_at: monthDate(m0.year, m0.month, 20) + "T00:00:00Z",
      ...audit,
      issue_images: [],
    },
    {
      id: "demo-issue-2",
      project_id: DEMO_PROJECT_ID,
      title: "Waterproofing delay — Basement B2",
      description: null,
      priority: "medium",
      status: "in_progress",
      location: "Basement B2",
      assigned_to: null,
      due_date: null,
      resolved_at: null,
      created_at: monthDate(m0.year, m0.month, 18) + "T00:00:00Z",
      updated_at: monthDate(m0.year, m0.month, 18) + "T00:00:00Z",
      ...audit,
      issue_images: [],
    },
    {
      id: "demo-issue-3",
      project_id: DEMO_PROJECT_ID,
      title: "Paint finish variance — Level 5",
      description: null,
      priority: "low",
      status: "open",
      location: "Tower A, Level 5",
      assigned_to: null,
      due_date: null,
      resolved_at: null,
      created_at: monthDate(m0.year, m0.month, 10) + "T00:00:00Z",
      updated_at: monthDate(m0.year, m0.month, 10) + "T00:00:00Z",
      ...audit,
      issue_images: [],
    },
  ];

  return {
    projects: [project],
    events,
    tours,
    reports,
    issues,
  };
}
