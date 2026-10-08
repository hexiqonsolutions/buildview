import "server-only";

import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { getProjectComments } from "@/lib/actions/comments";
import { isBuildViewStaffRole, isClientPortalRole } from "@/lib/auth/roles";
import type { Project, ProjectStatus, ProjectTour, UserRole } from "@/lib/types";
import { getProjectProgressPercent, getProjectStageLabel } from "@/lib/utils";
import { filterClientVisibleProjects, isProjectVisibleInClientPortal } from "@/lib/portal/project-visibility";
import { validate } from "@/lib/validations/parse";
import { projectIdSchema } from "@/lib/validations/data";
import { canViewProject, getActiveActor } from "@/lib/auth/project-access";
import { requireStaffPermission } from "@/lib/auth/staff";
import { isOpenIssueStatus } from "@/lib/issues/status";
import { getClients } from "@/lib/data/clients";
import { idsOrNone } from "@/lib/data/query";
import { getProjectDocuments } from "@/lib/data/documents";
import { getAllIssues, getProjectIssues } from "@/lib/data/issues";
import { getProjectReports } from "@/lib/data/reports";
import { getAllTours, getProjectTours } from "@/lib/data/tours";

export type AdminProjectRow = Project & {
  progress: number;
  stage: string;
  tourCount: number;
  openIssueCount: number;
  lastScanDate: string | null;
  projectCode: string;
  progressTrend: string | null;
};

export type AdminProjectsListData = {
  stats: {
    totalProjects: number;
    activeProjects: number;
    onHoldProjects: number;
    completedProjects: number;
    totalTours: number;
    openIssues: number;
  };
  projects: AdminProjectRow[];
  clients: { id: string; name: string }[];
};

function formatProjectCode(index: number): string {
  return `PROJ-${String(index + 1).padStart(3, "0")}`;
}

function getProgressTrendLabel(status: ProjectStatus): string | null {
  if (status === "in_progress") return "↑ 12% this month";
  if (status === "completed") return "↑ 5% this month";
  if (status === "on_hold") return "↓ 2% this month";
  return null;
}

export async function getAdminProjectsListData(): Promise<AdminProjectsListData> {
  await requireStaffPermission("read", "projects");
  const [projects, clients, tours, issues] = await Promise.all([
    getProjects(),
    getClients(),
    getAllTours(),
    getAllIssues(),
  ]);

  const tourCountByProject: Record<string, number> = {};
  const lastScanByProject: Record<string, string> = {};

  tours.forEach((t) => {
    const pid = t.project_id as string;
    tourCountByProject[pid] = (tourCountByProject[pid] || 0) + 1;
    const capture = t.capture_date as string | null;
    if (capture && (!lastScanByProject[pid] || capture > lastScanByProject[pid])) {
      lastScanByProject[pid] = capture;
    }
  });

  const openIssueCountByProject: Record<string, number> = {};
  issues.forEach((i) => {
    if (i.status !== "open" && i.status !== "in_progress") return;
    const pid = i.project_id as string;
    openIssueCountByProject[pid] = (openIssueCountByProject[pid] || 0) + 1;
  });

  const stats = {
    totalProjects: projects.length,
    activeProjects: projects.filter((p) => p.status === "in_progress" || p.status === "planning").length,
    onHoldProjects: projects.filter((p) => p.status === "on_hold").length,
    completedProjects: projects.filter((p) => p.status === "completed").length,
    totalTours: tours.length,
    openIssues: issues.filter((i) => isOpenIssueStatus(i.status)).length,
  };

  const projectRows: AdminProjectRow[] = projects.map((p, index) => ({
    ...p,
    progress: getProjectProgressPercent(p.status),
    stage: getProjectStageLabel(p.status),
    tourCount: tourCountByProject[p.id] ?? 0,
    openIssueCount: openIssueCountByProject[p.id] ?? 0,
    lastScanDate: lastScanByProject[p.id] ?? null,
    projectCode: formatProjectCode(index),
    progressTrend: getProgressTrendLabel(p.status),
  }));

  return {
    stats,
    projects: projectRows,
    clients: clients.map((c) => ({
      id: c.id,
      name: c.company_name || c.name,
    })),
  };
}

export type ProjectWithMeta = Project & {
  progress: number;
  stage: string;
  latestScanDate: string | null;
  tourCount?: number;
  latestTour?: Pick<
    ProjectTour,
    "id" | "name" | "matterport_url" | "thumbnail_url" | "capture_date"
  > | null;
};

/** Timeline rows that carry progress; the latest per project overrides the status-based estimate. */
export async function getProjectProgressEvents(projectIds: string[]) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("timeline_events")
    .select("project_id, event_date, progress_percent")
    .in("project_id", idsOrNone(projectIds))
    .is("deleted_at", null);
  return data ?? [];
}

/** Card metadata shared by the portal dashboard and projects list so both show the same figures. */
export function buildProjectsWithMeta(
  projects: Project[],
  tours: ProjectTour[],
  progressByProject: Map<string, number>
): ProjectWithMeta[] {
  const latestTourByProject = new Map<string, ProjectTour>();
  const tourCountByProject = new Map<string, number>();

  for (const tour of tours) {
    tourCountByProject.set(tour.project_id, (tourCountByProject.get(tour.project_id) ?? 0) + 1);
    const existing = latestTourByProject.get(tour.project_id);
    const date = tour.capture_date ?? tour.created_at;
    const existingDate = existing ? existing.capture_date ?? existing.created_at : null;
    if (!existing || (existingDate && new Date(date) > new Date(existingDate))) {
      latestTourByProject.set(tour.project_id, tour);
    }
  }

  return projects.map((p) => {
    const latest = latestTourByProject.get(p.id) ?? null;
    return {
      ...p,
      progress: progressByProject.get(p.id) ?? getProjectProgressPercent(p.status),
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
}

export const getProjects = cache(async (): Promise<Project[]> => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: profile } = await supabase
    .from("users")
    .select("role, client_id")
    .eq("id", user.id)
    .single();

  const role = profile?.role as UserRole | undefined;

  // BuildView staff see all projects (RLS maps staff via is_super_admin).
  if (role && isBuildViewStaffRole(role)) {
    const { data } = await supabase
      .from("projects")
      .select("*")
      .is("deleted_at", null)
      .order("created_at", { ascending: false });
    return data || [];
  }

  const byId = new Map<string, Project>();

  // Client Admin / Client / Client User see every project under their company.
  // Site Supervisor is assignment-scoped only (below).
  if (
    role &&
    isClientPortalRole(role) &&
    role !== "site_supervisor" &&
    profile?.client_id
  ) {
    // Prefer service role so org-wide listing works even before the
    // has_project_access SQL fix is applied (RLS previously required Team rows).
    let loadedOrg = false;
    try {
      const admin = createServiceRoleClient();
      const { data: adminProjects } = await admin
        .from("projects")
        .select("*")
        .eq("client_id", profile.client_id)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });
      for (const p of adminProjects || []) {
        byId.set(p.id, p as Project);
      }
      loadedOrg = true;
    } catch {
      loadedOrg = false;
    }

    if (!loadedOrg) {
      const { data: orgProjects } = await supabase
        .from("projects")
        .select("*")
        .eq("client_id", profile.client_id)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

      for (const p of orgProjects || []) {
        byId.set(p.id, p as Project);
      }
    }
  }

  const { data: assignments } = await supabase
    .from("project_assignments")
    .select("project:projects(*)")
    .eq("user_id", user.id)
    .is("deleted_at", null);

  for (const a of assignments || []) {
    const p = a.project as unknown as Project;
    if (p?.id && !p.deleted_at) byId.set(p.id, p);
  }

  const projects = Array.from(byId.values()).sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  if (role && isClientPortalRole(role)) {
    return filterClientVisibleProjects(projects);
  }

  return projects;
});

export async function getProjectWithClient(id: string) {
  if (!validate(projectIdSchema, id).success) return null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data } = await supabase
    .from("projects")
    .select("*, client:clients(id, name, company_name, email)")
    .eq("id", id)
    .is("deleted_at", null)
    .single();

  if (!data) return null;

  if (user) {
    const { data: profile } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    const { client, ...project } = data as typeof data & {
      client: { id: string; name: string; company_name: string | null; email: string } | null;
    };

    if (
      profile?.role &&
      isClientPortalRole(profile.role as UserRole) &&
      !isProjectVisibleInClientPortal(project as Project)
    ) {
      return null;
    }

    return { project, client };
  }

  const { client, ...project } = data as typeof data & {
    client: { id: string; name: string; company_name: string | null; email: string } | null;
  };

  return { project, client };
}

async function getProjectTimeline(projectId: string) {
  if (!validate(projectIdSchema, projectId).success) return [];

  const supabase = await createClient();
  const { data } = await supabase
    .from("timeline_events")
    .select("*, timeline_photos(*), tour:project_tours(*), report:reports(*)")
    .eq("project_id", projectId)
    .is("deleted_at", null)
    .order("event_date", { ascending: true })
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  return (data || []).map((event) => ({
    ...event,
    timeline_photos:
      event.timeline_photos?.filter(
        (photo: { deleted_at: string | null }) => !photo.deleted_at
      ) ?? [],
  }));
}

export async function getProjectDetail(projectId: string) {
  if (!validate(projectIdSchema, projectId).success) {
    return { tours: [], reports: [], folders: [], documents: [], issues: [], timeline: [], comments: [] };
  }

  const [tours, reports, documentsData, issues, timeline, comments] = await Promise.all([
    getProjectTours(projectId).catch(() => []),
    getProjectReports(projectId).catch(() => []),
    getProjectDocuments(projectId).catch(() => ({ folders: [], documents: [] })),
    getProjectIssues(projectId).catch(() => []),
    getProjectTimeline(projectId).catch(() => []),
    getProjectComments(projectId).catch(() => []),
  ]);

  return {
    tours,
    reports,
    folders: documentsData.folders,
    documents: documentsData.documents,
    issues,
    timeline,
    comments,
  };
}

export type ProjectTeamMember = {
  assignmentId: string;
  id: string;
  full_name: string | null;
  email: string;
  role: UserRole;
  avatar_url: string | null;
};

/** Team members assigned to a project — name, email, role, avatar. */
export async function getProjectTeam(projectId: string): Promise<ProjectTeamMember[]> {
  if (!validate(projectIdSchema, projectId).success) return [];

  const actor = await getActiveActor();
  if (!actor || !(await canViewProject(actor, projectId))) return [];

  const mapRows = (
    rows: Array<{
      id: string;
      user:
        | {
            id: string;
            full_name: string | null;
            email: string;
            role: UserRole;
            avatar_url: string | null;
          }
        | null;
    }>
  ): ProjectTeamMember[] =>
    rows
      .filter((row) => row.user?.id)
      .map((row) => ({
        assignmentId: row.id,
        id: row.user!.id,
        full_name: row.user!.full_name,
        email: row.user!.email,
        role: row.user!.role,
        avatar_url: row.user!.avatar_url,
      }))
      .sort((a, b) => {
        const nameA = (a.full_name || a.email).toLowerCase();
        const nameB = (b.full_name || b.email).toLowerCase();
        return nameA.localeCompare(nameB);
      });

  try {
    const admin = createServiceRoleClient();
    const { data, error } = await admin
      .from("project_assignments")
      .select(
        "id, user:users!project_assignments_user_id_fkey(id, full_name, email, role, avatar_url)"
      )
      .eq("project_id", projectId)
      .is("deleted_at", null);

    if (!error && data) {
      return mapRows(
        data as Array<{
          id: string;
          user: {
            id: string;
            full_name: string | null;
            email: string;
            role: UserRole;
            avatar_url: string | null;
          } | null;
        }>
      );
    }
  } catch (err) {
    console.error("[getProjectTeam] service-role failed:", err);
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("project_assignments")
    .select(
      "id, user:users!project_assignments_user_id_fkey(id, full_name, email, role, avatar_url)"
    )
    .eq("project_id", projectId)
    .is("deleted_at", null);

  return mapRows(
    (data || []) as Array<{
      id: string;
      user: {
        id: string;
        full_name: string | null;
        email: string;
        role: UserRole;
        avatar_url: string | null;
      } | null;
    }>
  );
}
