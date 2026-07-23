import type { WorkspaceScope } from "@/lib/admin/workspace";
import { filterToursByScope } from "@/lib/admin/scope";
import { normalizeWorkspaceScope } from "@/lib/admin/workspace-scope";
import { portalToAdminBootstrap } from "@/lib/portal/workspace";
import {
  getAccessibleTours,
  getPortalWorkspaceBootstrap,
  getProjects,
  type ProjectWithMeta,
} from "@/lib/actions/data";
import { getProjectProgressPercent } from "@/lib/utils";
import type { Project, ProjectTour } from "@/lib/types";

export type PortfolioProjectItem = ProjectWithMeta & {
  tourCount: number;
  latestTour: (ProjectTour & { projectName: string }) | null;
};

export type PortfolioDashboardData = {
  clientName: string | null;
  clientLogoUrl: string | null;
  tagline: string;
  stats: {
    projects: number;
    walkthroughs: number;
    locations: number;
    completed: number;
  };
  featuredProject: PortfolioProjectItem | null;
  featuredTour: (ProjectTour & { projectName: string; projectId: string }) | null;
  projects: PortfolioProjectItem[];
  recentWalkthroughs: Array<
    ProjectTour & { projectName: string; projectId: string }
  >;
};

function toProjectMeta(projects: Project[], tours: ProjectTour[]): ProjectWithMeta[] {
  const latestTourByProject = new Map<string, string>();
  tours.forEach((t) => {
    const pid = t.project_id;
    const d = t.capture_date ?? t.created_at;
    const prev = latestTourByProject.get(pid);
    if (!prev || new Date(d).getTime() > new Date(prev).getTime()) {
      latestTourByProject.set(pid, d);
    }
  });

  return projects.map((p) => ({
    ...p,
    progress: getProjectProgressPercent(p.status),
    stage: p.status === "completed" ? "Completed" : "In progress",
    latestScanDate: latestTourByProject.get(p.id) ?? null,
  }));
}

export async function getPortfolioDashboardData(
  scope: WorkspaceScope
): Promise<PortfolioDashboardData> {
  const bootstrap = await getPortalWorkspaceBootstrap();
  const normalized = normalizeWorkspaceScope(portalToAdminBootstrap(bootstrap), {
    ...scope,
    clientId: scope.clientId ?? bootstrap.clientId,
  });

  const [projectsRaw, toursRaw] = await Promise.all([getProjects(), getAccessibleTours()]);

  // Portfolio home always shows every assigned project.
  // Workspace `?project=` is for navigating into a project, not for hiding the rest.
  const projects = projectsRaw;
  const projectIds = new Set(projects.map((p) => p.id));

  // Tours still respect building/floor filters when set; ignore project-only narrowing.
  const tourScope = {
    ...normalized,
    projectId: null,
  };
  const scopedTours = filterToursByScope(
    toursRaw as ProjectTour[],
    tourScope,
    projectIds
  ) as ProjectTour[];

  const projectsWithMeta = toProjectMeta(projects, scopedTours);
  const projectNameById = new Map(projects.map((p) => [p.id, p.name]));

  const toursByProject = new Map<string, ProjectTour[]>();
  scopedTours.forEach((t) => {
    const list = toursByProject.get(t.project_id) ?? [];
    list.push(t);
    toursByProject.set(t.project_id, list);
  });

  const portfolioProjects: PortfolioProjectItem[] = projectsWithMeta.map((project) => {
    const projectTours = [...(toursByProject.get(project.id) ?? [])].sort(
      (a, b) =>
        new Date(b.capture_date ?? b.created_at).getTime() -
        new Date(a.capture_date ?? a.created_at).getTime()
    );
    const latest = projectTours[0];
    return {
      ...project,
      tourCount: projectTours.length,
      latestTour: latest
        ? { ...latest, projectName: project.name }
        : null,
    };
  });

  const sortedTours = [...scopedTours].sort(
    (a, b) =>
      new Date(b.capture_date ?? b.created_at).getTime() -
      new Date(a.capture_date ?? a.created_at).getTime()
  );

  const featuredTour = sortedTours[0]
    ? {
        ...sortedTours[0],
        projectName: projectNameById.get(sortedTours[0].project_id) ?? "Project",
        projectId: sortedTours[0].project_id,
      }
    : null;

  const locations = new Set(
    projects.map((p) => p.location?.trim()).filter(Boolean) as string[]
  );

  const clientName = bootstrap.clientName;
  const tagline = clientName
    ? `Immersive walkthroughs and curated work by ${clientName}`
    : "Immersive walkthroughs and curated project showcase";

  const sortedProjects = [...portfolioProjects].sort((a, b) => {
    const aDate = a.latestTour?.capture_date ?? a.latestTour?.created_at ?? a.created_at;
    const bDate = b.latestTour?.capture_date ?? b.latestTour?.created_at ?? b.created_at;
    return new Date(bDate).getTime() - new Date(aDate).getTime();
  });

  // Prefer a project that already has a Matterport tour as the featured hero.
  const featuredProject =
    sortedProjects.find((p) => p.latestTour?.matterport_url) ?? sortedProjects[0] ?? null;

  return {
    clientName,
    clientLogoUrl: bootstrap.clientLogoUrl,
    tagline,
    stats: {
      projects: sortedProjects.length,
      walkthroughs: scopedTours.length,
      locations: locations.size,
      completed: sortedProjects.filter((p) => p.status === "completed").length,
    },
    featuredProject,
    featuredTour,
    projects: sortedProjects,
    recentWalkthroughs: sortedTours.slice(0, 6).map((t) => ({
      ...t,
      projectName: projectNameById.get(t.project_id) ?? "Project",
      projectId: t.project_id,
    })),
  };
}
