import { constructionTourUrl, thumbFor } from "./matterport";
import type {
  ConstructionDashboardFixture,
  DemoComment,
  DemoIssue,
  DemoProgressionPhase,
  DemoProject,
  DemoTimelineEvent,
  DemoTour,
} from "./types";

const MP = constructionTourUrl();
const THUMB = thumbFor(MP);

const SITE = [
  "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=800&h=600&fit=crop",
  "https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=800&h=600&fit=crop",
  "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800&h=600&fit=crop",
  "https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=800&h=600&fit=crop",
  "https://images.unsplash.com/photo-1429497419816-9ca5cfb9829f?w=800&h=600&fit=crop",
  "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&h=600&fit=crop",
];

const PROJECT_ID = "exp-construction-meridian-tower";

const SCAN_SCHEDULE: Array<{
  id: string;
  name: string;
  date: string;
  building: string;
  floor: string;
  note: string;
}> = [
  { id: "tour-01", name: "Site establishment — baseline", date: "2023-04-18", building: "Tower A", floor: "Basement", note: "Initial dig and pile layout capture" },
  { id: "tour-02", name: "Foundation complete", date: "2023-08-22", building: "Tower A", floor: "Basement", note: "Raft complete, waterproofing underway" },
  { id: "tour-03", name: "Podium L1–L3 structure", date: "2023-12-14", building: "Tower A", floor: "Podium L2", note: "Retail podium columns and slabs" },
  { id: "tour-04", name: "Tower core L8", date: "2024-04-09", building: "Tower A", floor: "Level 8", note: "Shear walls and MEP risers" },
  { id: "tour-05", name: "Tower core L16", date: "2024-08-20", building: "Tower A", floor: "Level 16", note: "Mid-rise structural progress" },
  { id: "tour-06", name: "Tower top-out L24", date: "2024-12-11", building: "Tower A", floor: "Level 24", note: "Structural top-out celebration scan" },
  { id: "tour-07", name: "Facade & envelope", date: "2025-03-18", building: "Tower A", floor: "Level 12", note: "Curtain wall install verification" },
  { id: "tour-08", name: "Interior drywall L4–L10", date: "2025-06-25", building: "Tower A", floor: "Level 7", note: "Fit-out corridor progress" },
  { id: "tour-09", name: "Lobby & amenity fit-out", date: "2025-09-16", building: "Tower A", floor: "Lobby", note: "Finishes and FF&E in place" },
  { id: "tour-10", name: "Pre-handover punch", date: "2025-11-28", building: "Tower A", floor: "Lobby", note: "Client walkthrough punch list" },
  { id: "tour-11", name: "Handover — as-built", date: "2026-01-20", building: "Tower A", floor: "All floors", note: "Final as-built digital twin" },
  { id: "tour-12", name: "Warranty close-out", date: "2026-03-05", building: "Tower A", floor: "Roof plant", note: "12-month warranty inspection scan" },
];

function buildTours(): DemoTour[] {
  return SCAN_SCHEDULE.map((s, i) => ({
    id: s.id,
    name: s.name,
    matterport_url: MP,
    capture_date: s.date,
    description: s.note,
    thumbnail_url: THUMB,
    building: s.building,
    floor: s.floor,
    sort_order: i,
  }));
}

function buildTimeline(): DemoTimelineEvent[] {
  const months: DemoTimelineEvent[] = [];
  const authors = ["Priya Nair (Site Eng.)", "Rahul Desai (Supervisor)", "Meridian PM", "BuildView Ops"];
  const floors = ["Basement", "Podium L2", "Level 8", "Level 16", "Level 24", "Lobby"];
  let pct = 4;
  for (let i = 0; i < 34; i++) {
    const d = new Date(2023, 3 + i, 12 + (i % 10));
    const iso = d.toISOString().slice(0, 10);
    pct = Math.min(100, pct + (i < 28 ? 3 + (i % 3) : 1));
    const tour = SCAN_SCHEDULE.find((s) => s.date.slice(0, 7) === iso.slice(0, 7));
    months.push({
      id: `tl-${i + 1}`,
      date: iso,
      title:
        pct >= 100
          ? "Project complete — handover package locked"
          : pct > 85
            ? "Finishes & commissioning sprint"
            : pct > 60
              ? "Envelope & MEP coordination"
              : pct > 35
                ? "Vertical structure progressing"
                : "Substructure & podium works",
      progress_note:
        pct >= 100
          ? "As-built twin delivered. All critical issues closed. Client signed practical completion."
          : `Monthly progress capture logged. Trades coordinated on ${floors[i % floors.length]}. Photo set and scan linked for client review.`,
      progress_percent: pct,
      trades: {
        Structure: Math.min(100, pct + 5),
        MEP: Math.min(100, Math.max(0, pct - 12)),
        Facade: Math.min(100, Math.max(0, pct - 20)),
        Finishes: Math.min(100, Math.max(0, pct - 35)),
      },
      author: authors[i % authors.length],
      building: "Tower A",
      floor: floors[i % floors.length],
      photo_urls: [SITE[i % SITE.length], SITE[(i + 2) % SITE.length]],
      tour_id: tour?.id ?? null,
    });
  }
  return months.reverse();
}

function buildIssues(): DemoIssue[] {
  return [
    {
      id: "iss-01",
      title: "Water seepage at podium expansion joint",
      description: "Observed dampness after monsoon at retail podium joint. Membrane patch scheduled.",
      priority: "critical",
      status: "resolved",
      location: "Podium L1 — Grid C4",
      assignee: "Rahul Desai",
      created_at: "2024-07-02T09:00:00Z",
      resolved_at: "2024-07-28T16:00:00Z",
      image_url: SITE[0],
    },
    {
      id: "iss-02",
      title: "Curtain wall gasket misalignment L12",
      description: "East elevation panels 12E-04 to 12E-07 show gasket gap. Vendor rework ordered.",
      priority: "high",
      status: "resolved",
      location: "Level 12 — East facade",
      assignee: "Priya Nair",
      created_at: "2025-03-21T11:20:00Z",
      resolved_at: "2025-04-09T14:00:00Z",
      image_url: SITE[1],
    },
    {
      id: "iss-03",
      title: "Fire stop missing at MEP riser L8",
      description: "QA flagged incomplete fire stopping around HVAC riser. Closed after re-inspect.",
      priority: "high",
      status: "closed",
      location: "Level 8 — Core riser",
      assignee: "BuildView Ops",
      created_at: "2024-09-14T08:30:00Z",
      resolved_at: "2024-09-22T17:10:00Z",
    },
    {
      id: "iss-04",
      title: "Lobby stone lippage near reception",
      description: "Marble lippage >2mm at reception desk threshold. Rework completed pre-handover.",
      priority: "medium",
      status: "resolved",
      location: "Lobby",
      assignee: "Interior GC",
      created_at: "2025-10-03T10:00:00Z",
      resolved_at: "2025-10-18T12:00:00Z",
      image_url: SITE[5],
    },
    {
      id: "iss-05",
      title: "Site access road dust control",
      description: "Neighbor complaint — dust from haul road. Water cart schedule increased.",
      priority: "low",
      status: "closed",
      location: "Site perimeter",
      assignee: "Meridian PM",
      created_at: "2023-11-05T07:00:00Z",
      resolved_at: "2023-11-12T18:00:00Z",
    },
    {
      id: "iss-06",
      title: "Temporary lighting outage L16 corridor",
      description: "Night works lighting failed on L16. Temporary stringers installed same shift.",
      priority: "medium",
      status: "closed",
      location: "Level 16",
      assignee: "Rahul Desai",
      created_at: "2024-10-19T20:15:00Z",
      resolved_at: "2024-10-20T01:40:00Z",
    },
    {
      id: "iss-07",
      title: "Warranty — roof plant vibration note",
      description: "Client noted vibration near AHU-3 during warranty visit. Isolators retuned.",
      priority: "medium",
      status: "resolved",
      location: "Roof plant",
      assignee: "MEP Vendor",
      created_at: "2026-02-18T09:45:00Z",
      resolved_at: "2026-03-01T15:00:00Z",
      image_url: SITE[3],
    },
    {
      id: "iss-08",
      title: "As-built twin annotation sync",
      description: "Minor mismatch between punch tags and scan markers. Ops reconciled in twin.",
      priority: "low",
      status: "closed",
      location: "Digital twin",
      assignee: "BuildView Ops",
      created_at: "2026-01-22T13:00:00Z",
      resolved_at: "2026-01-24T11:00:00Z",
    },
  ];
}

function buildComments(): DemoComment[] {
  return [
    {
      id: "c-1",
      author: "Ananya Shah",
      role: "Client Admin",
      message: "Can we get the August structural scan linked against last month's progress %? Board review next Tuesday.",
      created_at: "2024-08-22T08:12:00Z",
      status: "resolved",
      likes: 4,
      replies: [
        {
          id: "c-1-r1",
          author: "Priya Nair",
          role: "Site Engineer",
          message: "Linked tour-05 and updated progression for Tower A L16. Charts refreshed on the overview.",
          created_at: "2024-08-22T10:40:00Z",
        },
        {
          id: "c-1-r2",
          author: "BuildView Ops",
          role: "Operations",
          message: "Shared compare preset: Foundation (2023-08) vs Mid-rise (2024-08) for the board pack.",
          created_at: "2024-08-22T14:05:00Z",
        },
      ],
    },
    {
      id: "c-2",
      author: "Rahul Desai",
      role: "Site Supervisor",
      message: "Monsoon seep at podium joint logged as critical. Waterproofing crew booked for 8 Jul.",
      created_at: "2024-07-02T11:00:00Z",
      status: "resolved",
      likes: 6,
      replies: [
        {
          id: "c-2-r1",
          author: "Ananya Shah",
          role: "Client Admin",
          message: "Please attach post-repair scan photos to the issue before we close it.",
          created_at: "2024-07-03T09:20:00Z",
        },
        {
          id: "c-2-r2",
          author: "Rahul Desai",
          role: "Site Supervisor",
          message: "Done — photos + note added. Status moved to resolved after QA sign-off.",
          created_at: "2024-07-28T16:30:00Z",
        },
      ],
    },
    {
      id: "c-3",
      author: "Meridian PM",
      role: "Project Manager",
      message: "Facade vendor delayed two weeks. Please hold the March scan until panels 12E are corrected.",
      created_at: "2025-03-10T07:55:00Z",
      status: "resolved",
      likes: 2,
      replies: [
        {
          id: "c-3-r1",
          author: "BuildView Ops",
          role: "Operations",
          message: "Scan window moved to 18 Mar. Compare against Dec top-out still available.",
          created_at: "2025-03-10T09:10:00Z",
        },
      ],
    },
    {
      id: "c-4",
      author: "Ananya Shah",
      role: "Client Admin",
      message: "Lobby finishes look strong in the Sept walkthrough. Can marketing pull stills for the brochure?",
      created_at: "2025-09-17T15:22:00Z",
      status: "resolved",
      likes: 8,
      replies: [
        {
          id: "c-4-r1",
          author: "BuildView Ops",
          role: "Operations",
          message: "Exported lobby stills from tour-09 and dropped them in Documents → Marketing.",
          created_at: "2025-09-18T11:00:00Z",
        },
      ],
    },
    {
      id: "c-5",
      author: "Priya Nair",
      role: "Site Engineer",
      message: "Pre-handover punch list is down to 11 items. Most are cosmetic. Targeting PC by mid-Jan.",
      created_at: "2025-12-02T06:40:00Z",
      status: "resolved",
      likes: 5,
      replies: [],
    },
    {
      id: "c-6",
      author: "Ananya Shah",
      role: "Client Admin",
      message: "Practical completion signed. Thank you team — the as-built twin is exactly what we needed for FM.",
      created_at: "2026-01-21T12:00:00Z",
      status: "resolved",
      likes: 12,
      replies: [
        {
          id: "c-6-r1",
          author: "BuildView Ops",
          role: "Operations",
          message: "Warranty scan scheduled for Mar 2026. Twin remains available under Scans → Handover.",
          created_at: "2026-01-21T12:45:00Z",
        },
      ],
    },
    {
      id: "c-7",
      author: "Facilities Lead",
      role: "Client",
      message: "Warranty visit: AHU-3 vibration noted. Please keep the roof plant scan for FM records.",
      created_at: "2026-02-18T10:05:00Z",
      status: "resolved",
      likes: 3,
      replies: [
        {
          id: "c-7-r1",
          author: "MEP Vendor",
          role: "Vendor",
          message: "Isolators retuned. Issue iss-07 closed with before/after notes.",
          created_at: "2026-03-01T15:20:00Z",
        },
      ],
    },
  ];
}

function buildProgression(): DemoProject["progression"] {
  const phaseNames = [
    "Site & earthworks",
    "Foundations",
    "Podium structure",
    "Tower core",
    "Envelope",
    "MEP rough-in",
    "Interior fit-out",
    "Commissioning & handover",
  ];
  const phases: DemoProgressionPhase[] = phaseNames.map((name, pi) => ({
    id: `phase-${pi + 1}`,
    name,
    steps: Array.from({ length: 7 }, (_, si) => ({
      id: `step-${pi + 1}-${si + 1}`,
      name: `${name} — step ${si + 1}`,
      status: "completed" as const,
      completed_at: new Date(2023, 4 + pi * 4, 5 + si * 3).toISOString(),
    })),
  }));

  return {
    overall_percent: 100,
    pre_slab_percent: 100,
    post_slab_percent: 100,
    floors_complete: 8,
    floors_total: 8,
    phases,
    weekly: [
      { label: "W1", completed: 4 },
      { label: "W2", completed: 6 },
      { label: "W3", completed: 5 },
      { label: "W4", completed: 7 },
      { label: "W5", completed: 3 },
      { label: "W6", completed: 2 },
      { label: "W7", completed: 1 },
      { label: "W8", completed: 0 },
    ],
  };
}

export function getConstructionProject(): DemoProject {
  const tours = buildTours();
  return {
    id: PROJECT_ID,
    name: "Meridian Commercial Tower",
    client_name: "Meridian Development",
    location: "Navi Mumbai, India",
    description:
      "24-level Grade-A commercial tower with retail podium. Full digital-twin monitoring from foundation through practical completion and warranty close-out.",
    status: "completed",
    start_date: "2023-04-01",
    completion_date: "2026-01-20",
    cover_image_url: SITE[5],
    area_sqft: 485000,
    portfolio_category: null,
    progress: 100,
    stage: "Handover",
    tourCount: tours.length,
    latestTour: tours[tours.length - 1],
    tours,
    issues: buildIssues(),
    timeline: buildTimeline(),
    comments: buildComments(),
    progression: buildProgression(),
    reports: [
      { id: "r1", title: "Monthly Progress — Dec 2025", date: "2025-12-28", type: "Progress" },
      { id: "r2", title: "Practical Completion Pack", date: "2026-01-20", type: "Handover" },
      { id: "r3", title: "Facade QA Summary", date: "2025-04-12", type: "QA" },
      { id: "r4", title: "Warranty Inspection", date: "2026-03-05", type: "Warranty" },
    ],
    documents: [
      { id: "d1", name: "As-built drawings index.pdf", folder: "Handover", updated_at: "2026-01-20" },
      { id: "d2", name: "O&M manuals — MEP.zip", folder: "Facilities", updated_at: "2026-01-18" },
      { id: "d3", name: "Board pack — Aug 2024.pdf", folder: "Client", updated_at: "2024-08-23" },
      { id: "d4", name: "Marketing lobby stills", folder: "Marketing", updated_at: "2025-09-18" },
    ],
    media: [],
  };
}

export function getConstructionFixture(): ConstructionDashboardFixture {
  const project = getConstructionProject();
  return {
    mode: "construction",
    clientName: "Meridian Development",
    firstName: "Ananya",
    fullName: "Ananya Shah",
    email: "ananya@meridian-demo.buildview",
    kpis: {
      activeProjects: 0,
      totalTours: project.tourCount,
      reportsThisMonth: 1,
      openIssues: project.issues.filter((i) => i.status === "open" || i.status === "in_progress").length,
    },
    projects: [project],
    latestTour: project.latestTour,
  };
}

export const CONSTRUCTION_COMPARE = {
  scanAId: "tour-02",
  scanBId: "tour-11",
};
