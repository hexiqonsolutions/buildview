import "server-only";

import { createServiceRoleClient } from "@/lib/supabase/admin";
import type { RollupBasis, StageDefinition } from "@/lib/progression/completion";
import { plannedFromActivityPlans, type ActivityPlan } from "@/lib/progression/template";
import {
  computeZoneFloors,
  type CompletionActivity,
  type FloorZoneResult,
  type ObservationRecord,
  type ZoneRecord,
} from "@/lib/progression/zone-completion";

/**
 * Zone data for one or more projects (migration 048), read with the service
 * role; callers must check access first. Returns null per project when the
 * tables don't exist yet, so floors keep their checklist %.
 */

export type ProjectZoneData = {
  activities: CompletionActivity[];
  stages: StageDefinition[];
  basis: RollupBasis;
  zones: ZoneRecord[];
  observations: ObservationRecord[];
  /** "project" when this project overrides the BuildView default template. */
  templateSource: "project" | "default";
  /** Trades N/A by default per zone type (project override, else defaults). */
  naRules: { zoneType: string; activityKey: string }[];
  /** Planned start / end per trade per floor (migration 052). */
  plans: ActivityPlan[];
};

type ActivityRow = { project_id: string | null; key: string; name: string; weight: number; sort_order: number };
type StageRow = { project_id: string | null; key: string; name: string; credit: number; sort_order: number };

/** Project override if it has any rows, else BuildView defaults. */
function pickRows<T extends { project_id: string | null; sort_order: number }>(
  rows: T[],
  projectId: string
): T[] {
  const own = rows.filter((r) => r.project_id === projectId);
  return (own.length > 0 ? own : rows.filter((r) => r.project_id === null)).sort(
    (a, b) => a.sort_order - b.sort_order
  );
}

/** Stored outline → [[x, y], …] in 0–1, or null when missing / malformed. */
function parsePolygon(value: unknown): [number, number][] | null {
  if (!Array.isArray(value) || value.length < 3) return null;
  const points: [number, number][] = [];
  for (const p of value) {
    if (!Array.isArray(p) || p.length !== 2) return null;
    const [x, y] = p.map(Number);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
    points.push([Math.min(1, Math.max(0, x)), Math.min(1, Math.max(0, y))]);
  }
  return points;
}

export async function loadZoneData(projectIds: string[]): Promise<Map<string, ProjectZoneData>> {
  const result = new Map<string, ProjectZoneData>();
  if (projectIds.length === 0) return result;
  const admin = createServiceRoleClient();

  const { data: zoneRows, error: zoneError } = await admin
    .from("progress_zones" as never)
    .select("*")
    .in("project_id", projectIds)
    .is("deleted_at", null);
  if (zoneError || !zoneRows) return result; // migration 048 not applied
  const zones = zoneRows as unknown as Array<{
    id: string;
    project_id: string;
    floor_id: string;
    name: string;
    zone_type: string;
    area_sqft: number | null;
    custom_weight: number | null;
    sort_order: number;
    polygon: unknown;
  }>;

  const zoneIds = zones.map((z) => z.id);
  const [activitiesRes, stagesRes, naRes, obsRes, projectRes, rulesRes, plansRes] = await Promise.all([
    admin.from("completion_activities" as never).select("*"),
    admin.from("completion_stages" as never).select("*"),
    zoneIds.length
      ? admin.from("progress_zone_na" as never).select("*").in("zone_id", zoneIds)
      : Promise.resolve({ data: [], error: null }),
    admin.from("progress_observations" as never).select("*").in("project_id", projectIds),
    admin.from("projects").select("*").in("id", projectIds),
    admin.from("completion_na_rules" as never).select("*"),
    admin.from("completion_activity_plans" as never).select("*").in("project_id", projectIds),
  ]);
  const ruleRows = (rulesRes.error ? [] : (rulesRes.data ?? [])) as unknown as Array<{
    project_id: string | null;
    zone_type: string;
    activity_key: string;
  }>;
  const planRows = (plansRes.error ? [] : (plansRes.data ?? [])) as unknown as Array<{
    project_id: string;
    floor_id: string;
    activity_key: string;
    planned_start: string;
    planned_end: string;
  }>;

  const activityRows = (activitiesRes.data ?? []) as unknown as ActivityRow[];
  const stageRows = (stagesRes.data ?? []) as unknown as StageRow[];
  const naRows = (naRes.data ?? []) as unknown as Array<{ zone_id: string; activity_key: string }>;
  const obsRows = (obsRes.data ?? []) as unknown as Array<{
    id: string;
    project_id: string;
    zone_id: string;
    activity_key: string;
    stage_key: string;
    observed_on: string;
    created_at: string;
    verification_status: "verified" | "rejected" | null;
  }>;
  const basisByProject = new Map(
    ((projectRes.data ?? []) as Array<{ id: string; completion_rollup_basis?: string }>).map((p) => [
      p.id,
      (p.completion_rollup_basis as RollupBasis | undefined) ?? "area",
    ])
  );

  const naByZone = new Map<string, string[]>();
  for (const row of naRows) {
    const list = naByZone.get(row.zone_id) ?? [];
    list.push(row.activity_key);
    naByZone.set(row.zone_id, list);
  }

  for (const projectId of projectIds) {
    const ownRules = ruleRows.filter((r) => r.project_id === projectId);
    const rules = ownRules.length > 0 ? ownRules : ruleRows.filter((r) => r.project_id === null);
    result.set(projectId, {
      templateSource: activityRows.some((a) => a.project_id === projectId) ? "project" : "default",
      naRules: rules.map((r) => ({ zoneType: r.zone_type, activityKey: r.activity_key })),
      plans: planRows
        .filter((p) => p.project_id === projectId)
        .map((p) => ({
          floorId: p.floor_id,
          activityKey: p.activity_key,
          start: p.planned_start,
          end: p.planned_end,
        })),
      activities: pickRows(activityRows, projectId).map((a) => ({
        key: a.key,
        name: a.name,
        weight: Number(a.weight),
      })),
      stages: pickRows(stageRows, projectId).map((s) => ({
        key: s.key,
        name: s.name,
        credit: Number(s.credit),
      })),
      basis: basisByProject.get(projectId) ?? "area",
      zones: zones
        .filter((z) => z.project_id === projectId)
        .sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name))
        .map((z) => ({
          id: z.id,
          floorId: z.floor_id,
          name: z.name,
          zoneType: z.zone_type,
          area: z.area_sqft != null ? Number(z.area_sqft) : null,
          customWeight: z.custom_weight != null ? Number(z.custom_weight) : null,
          naKeys: naByZone.get(z.id) ?? [],
          polygon: parsePolygon(z.polygon),
        })),
      observations: obsRows
        .filter((o) => o.project_id === projectId)
        .map((o) => ({
          id: o.id,
          zoneId: o.zone_id,
          activityKey: o.activity_key,
          stageKey: o.stage_key,
          observedOn: o.observed_on,
          createdAt: o.created_at,
          verificationStatus: o.verification_status,
        })),
    });
  }
  return result;
}

/** Floor % (by floor id) for floors that have zones. */
export function zoneFloorResults(
  data: ProjectZoneData | undefined,
  date: string,
  verifiedOnly: boolean
): Map<string, FloorZoneResult> {
  if (!data || data.zones.length === 0) return new Map();
  return computeZoneFloors({
    zones: data.zones,
    activities: data.activities,
    stages: data.stages,
    observations: data.observations,
    date,
    verifiedOnly,
    basis: data.basis,
  });
}

/** Planned % per zoned floor on a date, from its trade plans (floor id → %). */
export function zoneFloorPlanned(
  data: ProjectZoneData | undefined,
  date: string
): Map<string, number> {
  const out = new Map<string, number>();
  if (!data || data.plans.length === 0) return out;
  const zonedFloors = new Set(data.zones.map((z) => z.floorId));
  for (const floorId of zonedFloors) {
    const planned = plannedFromActivityPlans(data.plans, data.activities, floorId, date);
    if (planned != null) out.set(floorId, planned);
  }
  return out;
}
