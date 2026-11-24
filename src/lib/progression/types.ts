import type { ProgressionTrack } from "@/lib/progression/catalog";
import type { ProjectCompletion } from "@/lib/progression/checklist-completion";

export type { ProgressionTrack };

export type ProgressionStepStatus = "pending" | "in_progress" | "completed";

export type ProgressionStepView = {
  id: string;
  templateStepId: string;
  stepNumber: number;
  phaseNumber: number;
  phaseName: string;
  phaseStage: string;
  title: string;
  status: ProgressionStepStatus;
  /** Start button moment (ISO timestamp). */
  startedAt: string | null;
  startedBy: string | null;
  startedByName: string | null;
  /** End button moment (ISO timestamp); mirrors completedAt for completed steps. */
  endedAt: string | null;
  endedBy: string | null;
  endedByName: string | null;
  completedAt: string | null;
  completedBy: string | null;
  completedByName: string | null;
  workDate: string | null;
  note: string | null;
  /** 360 scan linked as evidence (migration 047). */
  evidenceTourId: string | null;
  evidenceNote: string | null;
  /** Verifier decision; null = not reviewed yet. */
  verificationStatus: "verified" | "rejected" | null;
  verifiedAt: string | null;
  verifiedByName: string | null;
  verificationNote: string | null;
  source: "manual" | "ai";
};

/** A project 360 scan that can be linked as evidence. */
export type ProgressionScan = {
  id: string;
  name: string;
  captureDate: string | null;
  createdAt: string;
  floorId: string | null;
  matterportUrl: string;
};

export type ProgressionPhaseView = {
  number: number;
  name: string;
  stage: string;
  total: number;
  /** Ended steps (count toward %). */
  completed: number;
  inProgress: number;
  percent: number;
  /** Earliest step Start in this phase (ISO), null when nothing started. */
  startedAt: string | null;
  /** Latest step End in this phase (ISO), null when nothing ended. */
  endedAt: string | null;
  steps: ProgressionStepView[];
};

export type ProgressionDailyPoint = {
  date: string;
  completions: number;
};

export type ProgressionWeeklyPoint = {
  weekStart: string;
  label: string;
  completions: number;
};

/** One floor's checklist for a single track (56 steps). */
export type ProjectProgressionView = {
  id: string;
  projectId: string;
  track: ProgressionTrack;
  floorId: string;
  buildingId: string;
  buildingName: string;
  floorName: string;
  templateKey: string;
  /** Planned schedule for this floor + track (YYYY-MM-DD), null when unset. */
  plannedStartDate: string | null;
  /** Deadline for this floor + track (YYYY-MM-DD), null when unset. */
  plannedEndDate: string | null;
  overallPercent: number;
  completedCount: number;
  inProgressCount: number;
  totalCount: number;
  activated: boolean;
  phases: ProgressionPhaseView[];
  daily: ProgressionDailyPoint[];
  weekly: ProgressionWeeklyPoint[];
  canEdit: boolean;
};

/** Per-floor summary for one track. */
export type FloorProgressionSummary = {
  track: ProgressionTrack;
  floorId: string;
  buildingId: string;
  buildingName: string;
  floorName: string;
  percent: number;
  completedCount: number;
  inProgressCount: number;
  totalCount: number;
  /** Planned schedule for this floor + track (YYYY-MM-DD), null when unset. */
  plannedStartDate: string | null;
  plannedEndDate: string | null;
  /** True once any step in either track on this floor has Started. */
  activated: boolean;
};

/** Physical floor summary pooled across both tracks (Overview / combined %). */
export type CombinedFloorSummary = {
  floorId: string;
  buildingId: string;
  buildingName: string;
  floorName: string;
  percent: number;
  completedCount: number;
  inProgressCount: number;
  totalCount: number;
  activated: boolean;
};

export type TrackProgressionSummary = {
  track: ProgressionTrack;
  percent: number;
  completedCount: number;
  inProgressCount: number;
  totalCount: number;
};

/**
 * Project-level Progression bundle.
 * overallPercent pools Ended steps across both tracks for activated floors.
 */
export type ProjectProgressionBundle = {
  projectId: string;
  overallPercent: number;
  floorCount: number;
  activatedFloorCount: number;
  /** Definable Completion result: actual, planned, variance, status, per-floor. */
  completion: ProjectCompletion;
  /** Only verified steps count toward % (project setting, migration 047). */
  verifiedOnly: boolean;
  /** Viewer may verify / reject steps and change verifiedOnly. */
  canVerify: boolean;
  /** Ended steps not yet verified, across the project. */
  pendingReviewCount: number;
  /** Project scans for evidence pickers, newest first. */
  scans: ProgressionScan[];
  /** Floor % from zones (floor id → %) for floors that have zones (M4). */
  zoneFloorPercents: Record<string, number>;
  /** Planned % from trade plans per zoned floor (M6). */
  zoneFloorPlannedPercents: Record<string, number>;
  /** Per-track floor summaries (two rows per physical floor). */
  floors: FloorProgressionSummary[];
  /** Physical floors pooled across tracks. */
  combinedFloors: CombinedFloorSummary[];
  tracks: TrackProgressionSummary[];
  /** Selected checklist per track (independent Tower/Floor per section). */
  selectedByTrack: Record<ProgressionTrack, ProjectProgressionView | null>;
  /** Legacy alias: Post-Slab selection. */
  selected: ProjectProgressionView | null;
  canEdit: boolean;
};
