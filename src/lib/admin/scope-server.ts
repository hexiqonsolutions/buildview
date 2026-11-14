import "server-only";

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
import { getDocumentsByProjectIds, getFoldersByProjectIds } from "@/lib/data/documents";
import { getIssuesByProjectIds } from "@/lib/data/issues";
import { getProjects } from "@/lib/data/projects";
import { getReportsByProjectIds } from "@/lib/data/reports";
import { getAdminSitePhotos } from "@/lib/data/storage";
import { getTimelineEventsByProjectIds } from "@/lib/data/timeline";
import { getToursByProjectIds } from "@/lib/data/tours";
import { getAdminWorkspaceBootstrap } from "@/lib/data/workspace";
import type { IssueWithRelations, ProjectTour, TimelineEventWithRelations } from "@/lib/types";

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

async function scopedProjectIdSet(scope: WorkspaceScope): Promise<Set<string>> {
  const normalized = await withNormalizedScope(scope);
  const projects = await getProjects();
  return new Set(projectIdsForScope(projects, normalized));
}

export async function getScopedProjects(scope: WorkspaceScope) {
  const normalized = await withNormalizedScope(scope);
  const projects = await getProjects();
  return filterProjectsByScope(projects, normalized);
}

export async function getScopedTours(scope: WorkspaceScope) {
  const normalized = await withNormalizedScope(scope);
  const ids = await scopedProjectIdSet(normalized);
  const tours = await getToursByProjectIds(Array.from(ids));
  return filterToursByScope(tours as ProjectTour[], normalized, ids);
}

export async function getScopedIssues(scope: WorkspaceScope) {
  const normalized = await withNormalizedScope(scope);
  const ids = await scopedProjectIdSet(normalized);
  const issues = await getIssuesByProjectIds(Array.from(ids));
  return filterBySpatialScope(issues, normalized, ids);
}

export async function getScopedDocuments(scope: WorkspaceScope) {
  const normalized = await withNormalizedScope(scope);
  const ids = await scopedProjectIdSet(normalized);
  const documents = await getDocumentsByProjectIds(Array.from(ids));
  const currentOnly = documents.filter((d) => d.is_current !== false);
  return filterBySpatialScope(currentOnly, normalized, ids);
}

export async function getScopedFolders(scope: WorkspaceScope) {
  const normalized = await withNormalizedScope(scope);
  const ids = await scopedProjectIdSet(normalized);
  const folders = await getFoldersByProjectIds(Array.from(ids));
  return filterByProjectScope(folders, ids, normalized);
}

export async function getScopedReports(scope: WorkspaceScope) {
  const normalized = await withNormalizedScope(scope);
  const ids = await scopedProjectIdSet(normalized);
  const reports = await getReportsByProjectIds(Array.from(ids));
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
  const projects = await getProjects();
  const scopedProjects = filterProjectsByScope(projects, normalized);
  const ids = new Set(projectIdsForScope(projects, normalized));
  const idList = Array.from(ids);

  const [events, tours, reports, issues] = await Promise.all([
    getTimelineEventsByProjectIds(idList),
    getToursByProjectIds(idList),
    getReportsByProjectIds(idList),
    getIssuesByProjectIds(idList),
  ]);

  return {
    projects: scopedProjects,
    events: filterBySpatialScope(
      events as TimelineEventWithRelations[],
      normalized,
      ids
    ),
    tours: filterToursByScope(tours as ProjectTour[], normalized, ids),
    reports: filterBySpatialScope(reports, normalized, ids),
    issues: filterBySpatialScope(issues as IssueWithRelations[], normalized, ids),
  };
}
