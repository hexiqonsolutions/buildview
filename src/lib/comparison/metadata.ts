import type { Project, ProjectTour } from "@/lib/types";
import type { EnrichedTour, TourMetadata } from "@/lib/comparison/types";
import { parseTourWorkspaceMeta } from "@/lib/admin/tour-metadata";
import { getProjectProgressPercent, getProjectStageLabel } from "@/lib/utils";

type ParsedMeta = Partial<TourMetadata>;

function tryParseDescription(description: string | null): ParsedMeta {
  const meta = parseTourWorkspaceMeta(description);
  if (!description?.trim() && !meta.building) return {};

  return {
    building: meta.building,
    floor: meta.floor,
    building_id: meta.building_id,
    floor_id: meta.floor_id,
    engineer: meta.engineer,
    notes: meta.notes,
    version: undefined,
    weather: undefined,
    projectStage: undefined,
    progressPercent: undefined,
  };
}

function inferFromName(name: string | null | undefined): ParsedMeta {
  if (!name) return {};
  const meta: ParsedMeta = {};
  const buildingMatch = name.match(/building[:\s]+([^|,/]+)/i);
  const floorMatch = name.match(/floor[:\s]+([^|,/]+)/i);
  if (buildingMatch) meta.building = buildingMatch[1].trim();
  if (floorMatch) meta.floor = floorMatch[1].trim();
  return meta;
}

export function buildTourMetadata(
  tour: ProjectTour,
  project: Project,
  index: number,
  total: number
): TourMetadata {
  const parsed = { ...inferFromName(tour.name), ...tryParseDescription(tour.description) };
  const baseProgress = getProjectProgressPercent(project.status);
  const step = total > 1 ? Math.round((index / (total - 1)) * (100 - baseProgress)) : 0;
  const progressPercent = parsed.progressPercent ?? Math.min(100, baseProgress + step);

  return {
    building: parsed.building ?? "Main Building",
    floor: parsed.floor ?? "All Floors",
    building_id: tour.building_id ?? parsed.building_id ?? null,
    floor_id: tour.floor_id ?? parsed.floor_id ?? null,
    engineer: parsed.engineer ?? "BuildView Site Engineer",
    version: parsed.version ?? `v${index + 1}.${tour.sort_order + 1}`,
    weather: parsed.weather ?? "Clear",
    projectStage: parsed.projectStage ?? getProjectStageLabel(project.status),
    progressPercent,
    notes: parsed.notes ?? tour.description ?? "",
  };
}

export function enrichTour(
  tour: ProjectTour & { project?: { id: string; name: string; client_name: string } | null },
  project: Project,
  index: number,
  total: number
): EnrichedTour {
  return {
    ...tour,
    metadata: buildTourMetadata(tour, project, index, total),
  };
}

export function getTourDate(tour: ProjectTour): Date {
  if (tour.capture_date) return new Date(tour.capture_date);
  return new Date(tour.created_at);
}

/** Lightweight fields for client Matterport UI (from tour JSON / name heuristics). */
export function getTourDisplayFields(tour: ProjectTour) {
  const parsed = { ...inferFromName(tour.name), ...tryParseDescription(tour.description) };
  return {
    engineer: parsed.engineer ?? null,
    building: parsed.building ?? null,
    floor: parsed.floor ?? null,
    building_id: tour.building_id ?? parsed.building_id ?? null,
    floor_id: tour.floor_id ?? parsed.floor_id ?? null,
    notes: parsed.notes ?? null,
  };
}
