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
  progressPercent: number;
  notes: string;
};

export type EnrichedTour = ProjectTour & {
  metadata: TourMetadata;
  project?: { id: string; name: string; client_name: string } | null;
};

export type TradeProgressItem = {
  trade: string;
  status: "completed" | "in_progress" | "started" | "pending";
  detail?: string;
  delta?: number;
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
  previousProgress: number;
  currentProgress: number;
  difference: number;
  scheduleStatus: "on_track" | "at_risk" | "delayed";
  qualityStatus: "good" | "review" | "concern";
  safetyStatus: "clear" | "watch" | "alert";
  healthScore: number;
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
