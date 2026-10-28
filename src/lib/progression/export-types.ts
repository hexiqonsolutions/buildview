import type { ProgressionTrack } from "@/lib/progression/catalog";

export type ProgressionExportStep = {
  stepNumber: number;
  phaseNumber: number;
  phaseName: string;
  title: string;
  status: "pending" | "in_progress" | "completed";
  startedAt: string | null;
  startedByName: string | null;
  endedAt: string | null;
  endedByName: string | null;
  workDate: string | null;
  note: string | null;
  /** True when this step had start/end/work activity inside the selected period. */
  activityInPeriod: boolean;
};

export type ProgressionExportTrack = {
  track: ProgressionTrack;
  trackLabel: string;
  percent: number;
  completedCount: number;
  inProgressCount: number;
  totalCount: number;
  plannedStartDate: string | null;
  plannedEndDate: string | null;
  periodCompletions: number;
  steps: ProgressionExportStep[];
};

export type ProgressionExportFloor = {
  floorId: string;
  floorName: string;
  activated: boolean;
  percent: number;
  completedCount: number;
  totalCount: number;
  periodCompletions: number;
  tracks: ProgressionExportTrack[];
};

export type ProgressionExportBuilding = {
  buildingId: string;
  buildingName: string;
  percent: number;
  completedCount: number;
  totalCount: number;
  periodCompletions: number;
  floors: ProgressionExportFloor[];
};

export type ProgressionExportActivity = {
  workDate: string;
  action: string;
  track: ProgressionTrack;
  trackLabel: string;
  buildingName: string;
  floorName: string;
  stepNumber: number | null;
  stepTitle: string | null;
};

export type ProgressionExportPayload = {
  projectId: string;
  projectName: string;
  projectLocation: string | null;
  clientName: string | null;
  from: string;
  to: string;
  generatedAt: string;
  overallPercent: number;
  activatedFloorCount: number;
  floorCount: number;
  periodCompletions: number;
  buildings: ProgressionExportBuilding[];
  periodActivity: ProgressionExportActivity[];
};
