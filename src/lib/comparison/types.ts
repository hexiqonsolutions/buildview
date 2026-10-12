import type {
  Document,
  IssueWithRelations,
  Project,
  ProjectTour,
  Report,
  TimelineEventWithRelations,
} from "@/lib/types";

export type TourMetadata = {
  building: string;
  floor: string;
  building_id?: string | null;
  floor_id?: string | null;
  engineer: string;
  version: string;
  weather: string;
  projectStage: string;
  notes: string;
};

export type EnrichedTour = ProjectTour & {
  metadata: TourMetadata;
  project?: { id: string; name: string; client_name: string } | null;
};

export type TradeProgressItem = {
  trade: string;
  status: "completed" | "in_progress" | "pending" | "not_recorded";
  /** Percent recorded in Timeline as of Scan A / Scan B; null when never recorded. */
  before: number | null;
  after: number | null;
  delta: number | null;
};

/** Timeline entry a scan's progress figures were read from. */
export type ProgressSource = {
  eventId: string;
  title: string;
  date: string;
  linkedToScan: boolean;
};

export type ScanProgress = {
  overall: number | null;
  /** Latest percent per trade, in the order trades were first entered. */
  trades: Map<string, number>;
  source: ProgressSource | null;
};

export type VisualChangeCard = {
  id: string;
  label: string;
  count: number;
  tone: "success" | "info" | "warning" | "danger" | "neutral";
};

export type ComparisonActivity = {
  id: string;
  type: string;
  label: string;
  timestamp: string;
};

export type ComparisonKpis = {
  /** Overall % recorded in Timeline; null when no entry covers that scan. */
  previousProgress: number | null;
  currentProgress: number | null;
  difference: number | null;
  scheduleStatus: "on_track" | "at_risk" | "delayed" | "unknown";
  qualityStatus: "good" | "review" | "concern";
  safetyStatus: "clear" | "watch" | "alert";
  healthScore: number | null;
};

export type SavedComparison = {
  id: string;
  name: string;
  projectId: string;
  tourAId: string;
  tourBId: string;
  building: string;
  floor: string;
  buildingId?: string | null;
  floorId?: string | null;
  createdAt: string;
};

export type ComparisonSnapshot = {
  project: Project;
  scanA: EnrichedTour;
  scanB: EnrichedTour;
  dateWindowLabel: string;
  kpis: ComparisonKpis;
  tradeProgress: TradeProgressItem[];
  /** Null until the full comparison has loaded from the server. */
  progressSources: { scanA: ProgressSource | null; scanB: ProgressSource | null } | null;
  visualChanges: VisualChangeCard[];
  documentsBetween: Document[];
  reportsBetween: Report[];
  newReports: Report[];
  resolvedIssues: IssueWithRelations[];
  newIssues: IssueWithRelations[];
  pendingIssues: IssueWithRelations[];
  criticalIssues: IssueWithRelations[];
  timelineEvents: TimelineEventWithRelations[];
  photosA: { id: string; url: string; caption: string | null; date: string; eventTitle?: string }[];
  photosB: { id: string; url: string; caption: string | null; date: string; eventTitle?: string }[];
  activities: ComparisonActivity[];
  engineerNotesA: string;
  engineerNotesB: string;
  aiPlaceholder: {
    overallProgress: string;
    keyChanges: string[];
    pendingActivities: string[];
    criticalRisks: string[];
    recommendedActions: string[];
  };
};

export type ComparisonProjectsData = {
  projects: Project[];
  tours: EnrichedTour[];
};
