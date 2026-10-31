export type ProjectStatus =
  | "planning"
  | "in_progress"
  | "completed"
  | "on_hold"
  | "archived";

export type PortfolioCategory = "architecture" | "interior" | "real_estate";

export type IssuePriority = "low" | "medium" | "high" | "critical";
export type IssueStatus = "open" | "in_progress" | "resolved" | "closed";

export interface DemoTour {
  id: string;
  name: string;
  matterport_url: string;
  capture_date: string;
  description: string;
  thumbnail_url: string;
  building: string;
  floor: string;
  sort_order: number;
}

export interface DemoIssue {
  id: string;
  title: string;
  description: string;
  priority: IssuePriority;
  status: IssueStatus;
  location: string;
  assignee: string;
  created_at: string;
  resolved_at: string | null;
  image_url?: string;
}

export interface DemoTimelineEvent {
  id: string;
  date: string;
  title: string;
  progress_note: string;
  progress_percent: number;
  trades: Record<string, number>;
  author: string;
  building: string;
  floor: string;
  photo_urls: string[];
  tour_id: string | null;
}

export interface DemoComment {
  id: string;
  author: string;
  role: string;
  message: string;
  created_at: string;
  status: "open" | "resolved";
  likes: number;
  replies: Array<{
    id: string;
    author: string;
    role: string;
    message: string;
    created_at: string;
  }>;
}

export interface DemoProgressionStep {
  id: string;
  name: string;
  status: "pending" | "in_progress" | "completed";
  completed_at: string | null;
}

export interface DemoProgressionPhase {
  id: string;
  name: string;
  steps: DemoProgressionStep[];
}

export interface DemoReport {
  id: string;
  title: string;
  date: string;
  type: string;
}

export interface DemoDocument {
  id: string;
  name: string;
  folder: string;
  updated_at: string;
}

export interface DemoMediaItem {
  id: string;
  type: "photo" | "video";
  title: string;
  url: string;
  sort_order: number;
}

export interface DemoProject {
  id: string;
  name: string;
  client_name: string;
  location: string;
  description: string;
  status: ProjectStatus;
  start_date: string;
  completion_date: string | null;
  cover_image_url: string;
  area_sqft: number | null;
  portfolio_category: PortfolioCategory | null;
  progress: number;
  stage: string;
  tourCount: number;
  latestTour: DemoTour | null;
  tours: DemoTour[];
  issues: DemoIssue[];
  timeline: DemoTimelineEvent[];
  comments: DemoComment[];
  progression: {
    overall_percent: number;
    pre_slab_percent: number;
    post_slab_percent: number;
    floors_complete: number;
    floors_total: number;
    phases: DemoProgressionPhase[];
    weekly: Array<{ label: string; completed: number }>;
  };
  reports: DemoReport[];
  documents: DemoDocument[];
  media: DemoMediaItem[];
}

export interface ConstructionDashboardFixture {
  mode: "construction";
  clientName: string;
  firstName: string;
  fullName: string;
  email: string;
  kpis: {
    activeProjects: number;
    totalTours: number;
    reportsThisMonth: number;
    openIssues: number;
  };
  projects: DemoProject[];
  latestTour: DemoTour | null;
}

export interface PortfolioDashboardFixture {
  mode: "portfolio";
  clientName: string;
  firstName: string;
  fullName: string;
  email: string;
  stats: {
    completed: number;
    locations: number;
    walkthroughs: number;
  };
  projects: DemoProject[];
  featuredProjectId: string;
}
