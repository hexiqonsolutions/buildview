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

export type ProjectProgressionView = {
  id: string;
  projectId: string;
  templateKey: string;
  overallPercent: number;
  completedCount: number;
  totalCount: number;
  phases: ProgressionPhaseView[];
  daily: ProgressionDailyPoint[];
  weekly: ProgressionWeeklyPoint[];
  canEdit: boolean;
};
