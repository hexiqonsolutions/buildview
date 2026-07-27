import type { Project, ProjectStatus } from "@/lib/types";

/** Statuses hidden from the client portal (admin can still see them). */
export const CLIENT_HIDDEN_PROJECT_STATUSES: ProjectStatus[] = [
  "archived",
  "suspended",
];

export function isProjectVisibleInClientPortal(
  project: Pick<Project, "status" | "deleted_at">
): boolean {
  if (project.deleted_at) return false;
  return !CLIENT_HIDDEN_PROJECT_STATUSES.includes(project.status);
}

export function filterClientVisibleProjects<T extends Pick<Project, "status" | "deleted_at">>(
  projects: T[]
): T[] {
  return projects.filter(isProjectVisibleInClientPortal);
}
