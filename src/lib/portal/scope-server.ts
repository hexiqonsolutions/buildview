import {
  filterBySpatialScope,
  filterProjectsByScope,
  filterToursByScope,
  parseWorkspaceScope,
  projectIdsForScope,
} from "@/lib/admin/scope";
import type { WorkspaceScope } from "@/lib/admin/workspace";
import { normalizeWorkspaceScope } from "@/lib/admin/workspace-scope";
import { portalToAdminBootstrap } from "@/lib/portal/workspace";
import {
  getAccessibleTours,
  getAllDocuments,
  getAllFolders,
  getAllIssues,
  getAllReports,
  getInvoices,
  getPortalWorkspaceBootstrap,
  getProjects,
  getTimelinePageData,
} from "@/lib/actions/data";
import { getNotifications } from "@/lib/actions/notifications";
import {
  filterNotificationsByProjectScope,
  isNarrowPortalScope,
} from "@/lib/portal/notification-scope";
import type { Invoice, ProjectTour } from "@/lib/types";

export { parseWorkspaceScope };

async function withPortalNormalizedScope(scope: WorkspaceScope): Promise<WorkspaceScope> {
  const bootstrap = await getPortalWorkspaceBootstrap();
  const adminBootstrap = portalToAdminBootstrap(bootstrap);
  return normalizeWorkspaceScope(adminBootstrap, {
    ...scope,
    clientId: scope.clientId ?? bootstrap.clientId,
  });
}

export async function parsePortalWorkspaceScopeFromParams(
  params: Record<string, string | string[] | undefined>
): Promise<WorkspaceScope> {
  const bootstrap = await getPortalWorkspaceBootstrap();
  const adminBootstrap = portalToAdminBootstrap(bootstrap);
  return normalizeWorkspaceScope(adminBootstrap, {
    ...parseWorkspaceScope(params),
    clientId: bootstrap.clientId,
  });
}

/** List pages show all client projects/files; URL project/building is for detail views only. */
export function broadPortalListScope(scope: WorkspaceScope): WorkspaceScope {
  return {
    ...scope,
    projectId: null,
    building: "all",
    floor: "all",
    buildingId: null,
    floorId: null,
  };
}

export async function getPortalScopedProjects(scope: WorkspaceScope) {
  const normalized = await withPortalNormalizedScope(scope);
  const projects = await getProjects();
  return filterProjectsByScope(projects, normalized);
}

export async function getPortalScopedAccessibleTours(scope: WorkspaceScope) {
  const normalized = await withPortalNormalizedScope(scope);
  const ids = await scopedProjectIds(normalized);
  const tours = await getAccessibleTours();
  return filterToursByScope(tours as ProjectTour[], normalized, ids);
}

async function scopedProjectIds(scope: WorkspaceScope): Promise<Set<string>> {
  const normalized = await withPortalNormalizedScope(scope);
  const projects = await getProjects();
  return new Set(projectIdsForScope(projects, normalized));
}

export async function getPortalScopedDocuments(scope: WorkspaceScope) {
  const normalized = await withPortalNormalizedScope(scope);
  const ids = await scopedProjectIds(normalized);
  const documents = await getAllDocuments();
  const currentOnly = documents.filter((d) => d.is_current !== false);
  return filterBySpatialScope(currentOnly, normalized, ids);
}

export async function getPortalScopedFolders(scope: WorkspaceScope) {
  const normalized = await withPortalNormalizedScope(scope);
  const ids = await scopedProjectIds(normalized);
  const folders = await getAllFolders();
  return folders.filter((folder) => ids.has(folder.project_id));
}

export async function getPortalScopedIssues(scope: WorkspaceScope) {
  const normalized = await withPortalNormalizedScope(scope);
  const ids = await scopedProjectIds(normalized);
  const issues = await getAllIssues();
  return filterBySpatialScope(issues, normalized, ids);
}

export async function getPortalScopedReports(scope: WorkspaceScope) {
  const normalized = await withPortalNormalizedScope(scope);
  const ids = await scopedProjectIds(normalized);
  const reports = await getAllReports();
  return filterBySpatialScope(reports, normalized, ids);
}

export async function getPortalScopedTimelinePageData(scope: WorkspaceScope) {
  const normalized = await withPortalNormalizedScope(scope);
  const data = await getTimelinePageData();
  const ids = await scopedProjectIds(normalized);

  return {
    projects: filterProjectsByScope(data.projects, normalized),
    events: filterBySpatialScope(data.events, normalized, ids),
    tours: filterToursByScope(data.tours, normalized, ids),
    reports: filterBySpatialScope(data.reports, normalized, ids),
    issues: filterBySpatialScope(data.issues, normalized, ids),
  };
}

export async function getPortalScopedInvoices(scope: WorkspaceScope): Promise<Invoice[]> {
  const normalized = await withPortalNormalizedScope(scope);
  const invoices = await getInvoices();

  if (!isNarrowPortalScope(normalized)) {
    return invoices;
  }

  const ids = await scopedProjectIds(normalized);
  return invoices.filter((invoice) => !invoice.project_id || ids.has(invoice.project_id));
}

export async function getPortalScopedNotifications(scope: WorkspaceScope) {
  const normalized = await withPortalNormalizedScope(scope);
  const notifications = await getNotifications();
  const ids = await scopedProjectIds(normalized);
  return filterNotificationsByProjectScope(notifications, ids, normalized);
}
