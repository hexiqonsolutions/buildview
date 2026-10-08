import {
  buildProjectsWithMeta,
  getProjectProgressEvents,
  getProjects,
} from "@/lib/data/projects";
import {
  getPortalScopedAccessibleTours,
  parsePortalWorkspaceScopeFromParams,
} from "@/lib/portal/scope-server";
import { resolveProjectProgressValues } from "@/lib/portal/progress-metrics";
import { ClientProjectsGallery } from "@/components/intel/projects/client-projects-gallery";
import type { ProjectTour } from "@/lib/types";
import { getCurrentUser } from "@/lib/actions/auth";
import { can } from "@/lib/auth/permissions";

export const dynamic = "force-dynamic";

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const scope = await parsePortalWorkspaceScopeFromParams(params);

  // Project list always shows every assigned project (workspace project filter is for detail pages).
  const [projects, tours, user] = await Promise.all([
    getProjects(),
    getPortalScopedAccessibleTours({ ...scope, projectId: null }),
    getCurrentUser(),
  ]);

  const progressEvents = await getProjectProgressEvents(projects.map((p) => p.id));
  const projectsWithMeta = buildProjectsWithMeta(
    projects,
    tours as ProjectTour[],
    resolveProjectProgressValues(projects, progressEvents)
  );
  const canUpdateStatus = user ? can(user.role, "update", "projects") : false;

  return <ClientProjectsGallery projects={projectsWithMeta} canUpdateStatus={canUpdateStatus} />;
}
