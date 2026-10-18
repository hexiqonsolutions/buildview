export type ProgressionStepStatus = "pending" | "completed";

export type ProgressionStepView = {
  id: string;
  templateStepId: string;
  stepNumber: number;
  phaseNumber: number;
  phaseName: string;
  phaseStage: string;
  title: string;
  status: ProgressionStepStatus;
  completedAt: string | null;
  completedBy: string | null;
  completedByName: string | null;
  workDate: string | null;
  note: string | null;
};

export type ProgressionPhaseView = {
  number: number;
  name: string;
  stage: string;
  total: number;
  completed: number;
  percent: number;
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

/** One floor's tick checklist (same 56-step template). */
export type ProjectProgressionView = {
  id: string;
  projectId: string;
  floorId: string;
  buildingId: string;
  buildingName: string;
  floorName: string;
  templateKey: string;
  overallPercent: number;
  completedCount: number;
  totalCount: number;
  activated: boolean;
  phases: ProgressionPhaseView[];
  daily: ProgressionDailyPoint[];
  weekly: ProgressionWeeklyPoint[];
  canEdit: boolean;
};

/** Floor row for Overview strip / Progression switcher. */
export type FloorProgressionSummary = {
  floorId: string;
  buildingId: string;
  buildingName: string;
  floorName: string;
  percent: number;
  completedCount: number;
  totalCount: number;
  /** True once at least one step is completed (counts toward project health). */
  activated: boolean;
};

/**
 * Project-level Progression bundle.
 * overallPercent averages activated floors only (equal step weight).
 */
export type ProjectProgressionBundle = {
  projectId: string;
  overallPercent: number;
  floorCount: number;
  activatedFloorCount: number;
  floors: FloorProgressionSummary[];
  /** Selected floor checklist; null when the project has no floors yet. */
  selected: ProjectProgressionView | null;
  canEdit: boolean;
};
