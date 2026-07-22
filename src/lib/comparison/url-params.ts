import type { WorkspaceScope } from "@/lib/admin/workspace";
import { WORKSPACE_PARAM_KEYS } from "@/lib/admin/scope";

const COMPARE_SCAN_A = "scanA";
const COMPARE_SCAN_B = "scanB";
/** Legacy deep link from Matterport manager */
const COMPARE_TOUR_A = "tourA";

export type CompareUrlParams = WorkspaceScope & {
  scanAId: string | null;
  scanBId: string | null;
};

export function parseCompareUrlParams(
  params: Record<string, string | string[] | undefined> | URLSearchParams
): CompareUrlParams {
  const get = (key: string): string | undefined => {
    if (params instanceof URLSearchParams) {
      return params.get(key) ?? undefined;
    }
    const value = params[key];
    if (Array.isArray(value)) return value[0];
    return value;
  };

  const buildingId = get(WORKSPACE_PARAM_KEYS.buildingId) ?? null;
  const floorId = get(WORKSPACE_PARAM_KEYS.floorId) ?? null;

  return {
    clientId: get(WORKSPACE_PARAM_KEYS.client) ?? null,
    projectId: get(WORKSPACE_PARAM_KEYS.project) ?? null,
    building: buildingId ? "all" : get(WORKSPACE_PARAM_KEYS.building) ?? "all",
    floor: floorId ? "all" : get(WORKSPACE_PARAM_KEYS.floor) ?? "all",
    buildingId,
    floorId,
    scanAId: get(COMPARE_SCAN_A) ?? get(COMPARE_TOUR_A) ?? null,
    scanBId: get(COMPARE_SCAN_B) ?? null,
  };
}

export function scopeToCompareQueryString(
  scope: WorkspaceScope,
  scanAId?: string | null,
  scanBId?: string | null,
  options?: { includeClient?: boolean }
): string {
  const params = new URLSearchParams();
  const includeClient = options?.includeClient ?? true;

  if (includeClient && scope.clientId) {
    params.set(WORKSPACE_PARAM_KEYS.client, scope.clientId);
  }
  if (scope.projectId) params.set(WORKSPACE_PARAM_KEYS.project, scope.projectId);

  if (scope.buildingId) {
    params.set(WORKSPACE_PARAM_KEYS.buildingId, scope.buildingId);
  } else if (scope.building && scope.building !== "all") {
    params.set(WORKSPACE_PARAM_KEYS.building, scope.building);
  }

  if (scope.floorId) {
    params.set(WORKSPACE_PARAM_KEYS.floorId, scope.floorId);
  } else if (scope.floor && scope.floor !== "all") {
    params.set(WORKSPACE_PARAM_KEYS.floor, scope.floor);
  }

  if (scanAId) params.set(COMPARE_SCAN_A, scanAId);
  if (scanBId) params.set(COMPARE_SCAN_B, scanBId);

  const qs = params.toString();
  return qs ? `?${qs}` : "";
}
