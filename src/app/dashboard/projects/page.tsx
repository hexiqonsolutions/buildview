import { getProjects } from "@/lib/actions/data";
import {
  getPortalScopedAccessibleTours,
  parsePortalWorkspaceScopeFromParams,
} from "@/lib/portal/scope-server";
import type { ProjectWithMeta } from "@/lib/actions/data";
import { getProjectProgressPercent, getProjectStageLabel } from "@/lib/utils";
import { ClientProjectsGallery } from "@/components/intel/projects/client-projects-gallery";
import type { ProjectTour } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const scope = await parsePortalWorkspaceScopeFromParams(params);

  // Project list always shows every assigned project (workspace project filter is for detail pages).
  const [projects, tours] = await Promise.all([
    getProjects(),
    getPortalScopedAccessibleTours({ ...scope, projectId: null }),
  ]);

  const latestTourByProject = new Map<string, ProjectTour>();
  const tourCountByProject = new Map<string, number>();

  tours.forEach((t) => {
    const tour = t as ProjectTour;
    tourCountByProject.set(tour.project_id, (tourCountByProject.get(tour.project_id) ?? 0) + 1);
    const existing = latestTourByProject.get(tour.project_id);
    const date = tour.capture_date ?? tour.created_at;
    const existingDate = existing
      ? existing.capture_date ?? existing.created_at
      : null;
    if (!existing || (existingDate && new Date(date) > new Date(existingDate))) {
      latestTourByProject.set(tour.project_id, tour);
    }
  });

  const projectsWithMeta: ProjectWithMeta[] = projects.map((p) => {
    const latest = latestTourByProject.get(p.id) ?? null;
    return {
      ...p,
      progress: getProjectProgressPercent(p.status),
      stage: getProjectStageLabel(p.status),
      latestScanDate: latest ? latest.capture_date ?? latest.created_at : null,
      tourCount: tourCountByProject.get(p.id) ?? 0,
      latestTour: latest
        ? {
            id: latest.id,
            name: latest.name,
            matterport_url: latest.matterport_url,
            thumbnail_url: latest.thumbnail_url,
            capture_date: latest.capture_date,
          }
        : null,
    };
  });

  return <ClientProjectsGallery projects={projectsWithMeta} />;
}
