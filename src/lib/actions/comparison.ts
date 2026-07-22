"use server";

import {
  getProjects,
  getAccessibleTours,
  getProjectDetail,
} from "@/lib/actions/data";
import { enrichTour } from "@/lib/comparison/metadata";
import {
  buildActivityLog,
  buildAiPlaceholder,
  buildKpis,
  buildTradeProgress,
  buildVisualChanges,
  bucketIssues,
  filterBetweenScans,
  filterIssuesBetween,
  filterReportsBetween,
  filterTimelineBetween,
  orderScans,
} from "@/lib/comparison/analytics";
import {
  documentAppearedAfterScanA,
  extractPhotosFromEvents,
  formatWindowLabel,
  getComparisonWindow,
} from "@/lib/comparison/date-window";
import {
  filterByComparisonSpatial,
  spatialScopeFromScans,
} from "@/lib/comparison/spatial";
import type {
  ComparisonProjectsData,
  ComparisonSnapshot,
  EnrichedTour,
  SavedComparison,
} from "@/lib/comparison/types";
import type { Project, ProjectTour } from "@/lib/types";
import { createClient } from "@/lib/supabase/server";
import { saveComparisonSchema } from "@/lib/validations/saved-comparison";

function isMissingSchemaError(error: { message?: string; code?: string } | null): boolean {
  if (!error) return false;
  const message = error.message ?? "";
  return (
    error.code === "PGRST205" ||
    /Could not find the table/i.test(message) ||
    /schema cache/i.test(message)
  );
}

const MIGRATION_HINT =
  "Saved comparisons need a database update. Apply supabase/pending-apply.sql in the Supabase SQL Editor.";

export async function getComparisonProjectsData(): Promise<ComparisonProjectsData> {
  const [projects, toursRaw] = await Promise.all([getProjects(), getAccessibleTours()]);

  const toursByProject = new Map<string, ProjectTour[]>();
  toursRaw.forEach((t) => {
    const list = toursByProject.get(t.project_id) ?? [];
    list.push(t as ProjectTour);
    toursByProject.set(t.project_id, list);
  });

  const tours: EnrichedTour[] = [];
  for (const tour of toursRaw) {
    const project = projects.find((p) => p.id === tour.project_id);
    if (!project) continue;
    const projectTours = toursByProject.get(project.id) ?? [];
    const sorted = [...projectTours].sort(
      (a, b) =>
        new Date(a.capture_date ?? a.created_at).getTime() -
        new Date(b.capture_date ?? b.created_at).getTime()
    );
    const index = sorted.findIndex((t) => t.id === tour.id);
    tours.push(
      enrichTour(
        tour as ProjectTour & {
          project?: { id: string; name: string; client_name: string } | null;
        },
        project,
        index,
        sorted.length
      )
    );
  }

  return { projects, tours };
}

function tourLinkedPhotos(
  timeline: Awaited<ReturnType<typeof getProjectDetail>>["timeline"],
  tourId: string
) {
  return timeline
    .filter((event) => event.tour_id === tourId)
    .flatMap((event) =>
      (event.timeline_photos ?? []).map((photo) => ({
        id: photo.id,
        url: photo.image_url,
        caption: photo.caption,
        date: event.event_date,
        eventTitle: event.title,
      }))
    );
}

export async function fetchComparisonSnapshot(
  tourAId: string,
  tourBId: string
): Promise<ComparisonSnapshot | null> {
  if (!tourAId || !tourBId || tourAId === tourBId) return null;

  const { projects, tours } = await getComparisonProjectsData();
  const rawA = tours.find((t) => t.id === tourAId);
  const rawB = tours.find((t) => t.id === tourBId);
  if (!rawA || !rawB) return null;

  const project = projects.find((p) => p.id === rawA.project_id) as Project | undefined;
  if (!project || rawB.project_id !== project.id) return null;

  const [scanA, scanB] = orderScans(rawA, rawB);
  const window = getComparisonWindow(scanA, scanB);
  const detail = await getProjectDetail(project.id);
  const spatial = spatialScopeFromScans(scanA, scanB);

  const scopedDocuments = filterByComparisonSpatial(
    detail.documents,
    spatial,
    project.id
  );
  const scopedReports = filterByComparisonSpatial(detail.reports, spatial, project.id);
  const scopedIssues = filterByComparisonSpatial(detail.issues, spatial, project.id);
  const scopedTimeline = filterByComparisonSpatial(detail.timeline, spatial, project.id);

  const documentsBetween = filterBetweenScans(scopedDocuments, scanA, scanB);
  const reportsBetween = filterReportsBetween(scopedReports, scanA, scanB);
  const issuesBetween = filterIssuesBetween(scopedIssues, scanA, scanB);
  const timelineEvents = filterTimelineBetween(scopedTimeline, scanA, scanB);

  const { resolvedIssues, newIssues, pendingIssues, criticalIssues } = bucketIssues(
    issuesBetween,
    window
  );

  const newReports = reportsBetween.filter((report) =>
    documentAppearedAfterScanA(report, window)
  );

  const windowPhotosA = extractPhotosFromEvents(timelineEvents, window, "before");
  const windowPhotosB = extractPhotosFromEvents(timelineEvents, window, "after");
  const photosA =
    windowPhotosA.length > 0 ? windowPhotosA : tourLinkedPhotos(detail.timeline, scanA.id);
  const photosB =
    windowPhotosB.length > 0 ? windowPhotosB : tourLinkedPhotos(detail.timeline, scanB.id);

  const kpis = buildKpis(scanA, scanB, issuesBetween);
  const tradeProgress = buildTradeProgress(scanA, scanB, reportsBetween, issuesBetween);
  const visualChanges = buildVisualChanges(documentsBetween, issuesBetween, reportsBetween);
  const activities = buildActivityLog(
    scanA,
    scanB,
    documentsBetween,
    reportsBetween,
    issuesBetween,
    timelineEvents
  );

  return {
    project,
    scanA,
    scanB,
    dateWindowLabel: formatWindowLabel(window),
    kpis,
    tradeProgress,
    visualChanges,
    documentsBetween,
    reportsBetween,
    newReports,
    resolvedIssues,
    newIssues,
    pendingIssues,
    criticalIssues,
    timelineEvents,
    photosA,
    photosB,
    activities,
    engineerNotesA: scanA.metadata.notes,
    engineerNotesB: scanB.metadata.notes,
    aiPlaceholder: buildAiPlaceholder(kpis, tradeProgress, criticalIssues),
  };
}

type SavedComparisonRow = {
  id: string;
  name: string;
  project_id: string;
  tour_a_id: string;
  tour_b_id: string;
  building: string;
  floor: string;
  building_id: string | null;
  floor_id: string | null;
  created_at: string;
};

function mapSavedComparisonRow(row: SavedComparisonRow): SavedComparison {
  return {
    id: row.id,
    name: row.name,
    projectId: row.project_id,
    tourAId: row.tour_a_id,
    tourBId: row.tour_b_id,
    building: row.building,
    floor: row.floor,
    buildingId: row.building_id,
    floorId: row.floor_id,
    createdAt: row.created_at,
  };
}

export async function listSavedComparisons(): Promise<SavedComparison[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("saved_comparisons")
    .select(
      "id, name, project_id, tour_a_id, tour_b_id, building, floor, building_id, floor_id, created_at"
    )
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    if (!isMissingSchemaError(error)) {
      console.error("listSavedComparisons:", error.message);
    }
    return [];
  }

  return (data ?? []).map(mapSavedComparisonRow);
}

export async function saveComparison(
  input: unknown
): Promise<{ success: true; item: SavedComparison } | { success: false; error: string }> {
  const parsed = saveComparisonSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.errors[0]?.message ?? "Invalid comparison data",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "You must be signed in to save comparisons" };
  }

  const data = parsed.data;

  const { data: row, error } = await supabase
    .from("saved_comparisons")
    .insert({
      user_id: user.id,
      name: data.name.trim(),
      project_id: data.projectId,
      tour_a_id: data.tourAId,
      tour_b_id: data.tourBId,
      building: data.building,
      floor: data.floor,
      building_id: data.buildingId ?? null,
      floor_id: data.floorId ?? null,
      client_id: data.clientId ?? null,
    })
    .select(
      "id, name, project_id, tour_a_id, tour_b_id, building, floor, building_id, floor_id, created_at"
    )
    .single();

  if (error || !row) {
    if (!isMissingSchemaError(error ?? null)) {
      console.error("saveComparison:", error?.message);
    }
    return {
      success: false,
      error: isMissingSchemaError(error ?? null)
        ? MIGRATION_HINT
        : error?.message ?? "Failed to save comparison",
    };
  }

  return { success: true, item: mapSavedComparisonRow(row) };
}

export async function deleteSavedComparison(
  id: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "You must be signed in" };
  }

  const { error } = await supabase
    .from("saved_comparisons")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    if (!isMissingSchemaError(error)) {
      console.error("deleteSavedComparison:", error.message);
    }
    return {
      success: false,
      error: isMissingSchemaError(error) ? MIGRATION_HINT : error.message,
    };
  }

  return { success: true };
}
