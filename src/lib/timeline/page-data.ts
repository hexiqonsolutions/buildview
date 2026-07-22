import type { IssueWithRelations, Project, ProjectTour, Report, TimelineEventWithRelations } from "@/lib/types";

export type TimelinePageData = {
  projects: Project[];
  events: TimelineEventWithRelations[];
  tours: Array<ProjectTour & { project?: { name: string } | null }>;
  reports: Array<Report & { project?: { name: string } | null }>;
  issues: IssueWithRelations[];
};
