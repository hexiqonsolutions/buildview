import {
  filterByProjectScope,
  filterBySpatialScope,
  filterProjectsByScope,
  filterToursByScope,
  parseWorkspaceScope,
  projectIdsForScope,
} from "@/lib/admin/scope";
import type { WorkspaceScope } from "@/lib/admin/workspace";
import { normalizeWorkspaceScope } from "@/lib/admin/workspace-scope";
import {
  getAdminSitePhotos,
  getAdminWorkspaceBootstrap,
  getAllDocuments,
  getAllFolders,
  getAllIssues,
  getAllReports,
  getAllTours,
  getProjects,
  getTimelinePageData,
} from "@/lib/actions/data";

export { parseWorkspaceScope };

export async function parseWorkspaceScopeFromParams(
  params: Record<string, string | string[] | undefined>
): Promise<WorkspaceScope> {
  const bootstrap = await getAdminWorkspaceBootstrap();
  return normalizeWorkspaceScope(bootstrap, parseWorkspaceScope(params));
}

async function withNormalizedScope(scope: WorkspaceScope): Promise<WorkspaceScope> {
  const bootstrap = await getAdminWorkspaceBootstrap();
  return normalizeWorkspaceScope(bootstrap, scope);
}

export async function getScopedProjects(scope: WorkspaceScope) {
  const normalized = await withNormalizedScope(scope);
  const projects = await getProjects();
  return filterProjectsByScope(projects, normalized);
}

export async function getScopedProjectIdSet(scope: WorkspaceScope): Promise<Set<string>> {
  const normalized = await withNormalizedScope(scope);
  const projects = await getProjects();
  return new Set(projectIdsForScope(projects, normalized));
}

export async function getScopedTours(scope: WorkspaceScope) {
  const normalized = await withNormalizedScope(scope);
  const [tours, projects] = await Promise.all([getAllTours(), getProjects()]);
  const ids = new Set(projectIdsForScope(projects, normalized));
  return filterToursByScope(tours, normalized, ids);
}

export async function getScopedIssues(scope: WorkspaceScope) {
  const normalized = await withNormalizedScope(scope);
  const [issues, projects] = await Promise.all([getAllIssues(), getProjects()]);
  const ids = new Set(projectIdsForScope(projects, normalized));
  return filterBySpatialScope(issues, normalized, ids);
}

export async function getScopedDocuments(scope: WorkspaceScope) {
  const normalized = await withNormalizedScope(scope);
  const [documents, projects] = await Promise.all([getAllDocuments(), getProjects()]);
  const ids = new Set(projectIdsForScope(projects, normalized));
  const currentOnly = documents.filter((d) => d.is_current !== false);
  return filterBySpatialScope(currentOnly, normalized, ids);
}

export async function getScopedFolders(scope: WorkspaceScope) {
  const normalized = await withNormalizedScope(scope);
  const [folders, projects] = await Promise.all([getAllFolders(), getProjects()]);
  const ids = new Set(projectIdsForScope(projects, normalized));
  return filterByProjectScope(folders, ids, normalized);
}

export async function getScopedReports(scope: WorkspaceScope) {
  const normalized = await withNormalizedScope(scope);
  const [reports, projects] = await Promise.all([getAllReports(), getProjects()]);
  const ids = new Set(projectIdsForScope(projects, normalized));
  return filterBySpatialScope(reports, normalized, ids);
}

export async function getScopedSitePhotos(scope: WorkspaceScope) {
  const normalized = await withNormalizedScope(scope);
  const [photos, projects] = await Promise.all([getAdminSitePhotos(), getProjects()]);
  const ids = new Set(projectIdsForScope(projects, normalized));
  return photos.filter((photo) => {
    const item = {
      project_id: photo.project_id,
      building: photo.building ?? null,
      floor: photo.floor ?? null,
    };
    return filterBySpatialScope([item], normalized, ids).length > 0;
  });
}

export async function getScopedTimelinePageData(scope: WorkspaceScope) {
  const normalized = await withNormalizedScope(scope);
  const data = await getTimelinePageData();
  const ids = new Set(projectIdsForScope(data.projects, normalized));

  return {
    projects: filterProjectsByScope(data.projects, normalized),
    events: filterBySpatialScope(data.events, normalized, ids),
    tours: filterToursByScope(data.tours, normalized, ids),
    reports: filterBySpatialScope(data.reports, normalized, ids),
    issues: filterBySpatialScope(data.issues, normalized, ids),
  };
}
