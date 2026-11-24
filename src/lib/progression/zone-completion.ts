import {
  floorPercent,
  tradePercent,
  zonePercent,
  type RollupBasis,
  type StageDefinition,
  type ZoneInput,
} from "@/lib/progression/completion";

/**
 * Zone-level completion (Milestone 4). Pure: turns zones, activity weights,
 * stage credits and append-only observations into zone / floor / trade %.
 *
 *   Activity % (zone) = credit of the latest counted observation on or before the date
 *                       (rejected never count; with "only verified", unverified don't either)
 *   Zone %            = weighted by activity weight, N/A activities excluded
 *   Floor %           = zones weighted by area | 1 | custom weight
 */

export type CompletionActivity = { key: string; name: string; weight: number };

export type ZoneRecord = {
  id: string;
  floorId: string;
  name: string;
  zoneType: string;
  area: number | null;
  customWeight: number | null;
  /** Activity keys marked not applicable for this zone. */
  naKeys: string[];
};

export type ObservationRecord = {
  id: string;
  zoneId: string;
  activityKey: string;
  stageKey: string;
  observedOn: string;
  createdAt: string;
  verificationStatus: "verified" | "rejected" | null;
};

export type ZoneCell = {
  /** null when the activity is N/A for the zone. */
  percent: number | null;
  /** Stage that counts toward % (null = nothing counted yet). */
  countedStageKey: string | null;
  /** Latest recorded stage, even if it doesn't count yet (pending review). */
  latestStageKey: string | null;
  latestObservedOn: string | null;
  latestStatus: "verified" | "rejected" | "pending" | null;
  /** Latest observation id (for verify / reject). */
  latestObservationId: string | null;
};

export type ZoneResult = {
  id: string;
  name: string;
  zoneType: string;
  area: number | null;
  percent: number | null;
  cells: Record<string, ZoneCell>;
};

export type FloorZoneResult = {
  floorId: string;
  percent: number;
  zones: ZoneResult[];
  /** Activity % across the floor's zones (same zone weights). */
  trades: Record<string, number | null>;
};

function byTime(a: ObservationRecord, b: ObservationRecord): number {
  return a.observedOn.localeCompare(b.observedOn) || a.createdAt.localeCompare(b.createdAt);
}

/** Effective basis: "area" falls back to "equal" when no zone has an area yet. */
export function effectiveBasis(zones: ZoneRecord[], basis: RollupBasis): RollupBasis {
  if (basis === "area" && !zones.some((z) => z.area != null && z.area > 0)) return "equal";
  if (basis === "custom" && !zones.some((z) => z.customWeight != null && z.customWeight > 0)) return "equal";
  return basis;
}

export function computeZoneFloors(input: {
  zones: ZoneRecord[];
  activities: CompletionActivity[];
  stages: StageDefinition[];
  observations: ObservationRecord[];
  date: string;
  verifiedOnly: boolean;
  basis: RollupBasis;
}): Map<string, FloorZoneResult> {
  const day = input.date.slice(0, 10);
  const credit = new Map(input.stages.map((s) => [s.key, s.credit]));
  const obsByCell = new Map<string, ObservationRecord[]>();
  for (const obs of input.observations) {
    const key = `${obs.zoneId}:${obs.activityKey}`;
    const list = obsByCell.get(key) ?? [];
    list.push(obs);
    obsByCell.set(key, list);
  }

  const zonesByFloor = new Map<string, ZoneRecord[]>();
  for (const zone of input.zones) {
    const list = zonesByFloor.get(zone.floorId) ?? [];
    list.push(zone);
    zonesByFloor.set(zone.floorId, list);
  }

  const result = new Map<string, FloorZoneResult>();
  for (const [floorId, zones] of zonesByFloor) {
    const zoneInputs: ZoneInput[] = [];
    const zoneResults: ZoneResult[] = [];

    for (const zone of zones) {
      const na = new Set(zone.naKeys);
      const cells: Record<string, ZoneCell> = {};
      const activities = input.activities.map((activity) => {
        if (na.has(activity.key)) {
          cells[activity.key] = {
            percent: null,
            countedStageKey: null,
            latestStageKey: null,
            latestObservedOn: null,
            latestStatus: null,
            latestObservationId: null,
          };
          return { key: activity.key, name: activity.name, weight: activity.weight, percent: null };
        }
        const history = (obsByCell.get(`${zone.id}:${activity.key}`) ?? [])
          .filter((o) => o.observedOn.slice(0, 10) <= day)
          .sort(byTime);
        const latest = history.at(-1) ?? null;
        const counted = [...history]
          .reverse()
          .find(
            (o) =>
              o.verificationStatus !== "rejected" &&
              (!input.verifiedOnly || o.verificationStatus === "verified") &&
              credit.has(o.stageKey)
          );
        const percent = counted ? (credit.get(counted.stageKey) ?? 0) : 0;
        cells[activity.key] = {
          percent,
          countedStageKey: counted?.stageKey ?? null,
          latestStageKey: latest?.stageKey ?? null,
          latestObservedOn: latest?.observedOn ?? null,
          latestObservationId: latest?.id ?? null,
          latestStatus: latest
            ? latest.verificationStatus === "verified"
              ? "verified"
              : latest.verificationStatus === "rejected"
                ? "rejected"
                : "pending"
            : null,
        };
        return { key: activity.key, name: activity.name, weight: activity.weight, percent };
      });

      zoneInputs.push({
        id: zone.id,
        name: zone.name,
        area: zone.area,
        customWeight: zone.customWeight,
        activities,
      });
      zoneResults.push({
        id: zone.id,
        name: zone.name,
        zoneType: zone.zoneType,
        area: zone.area,
        percent: zonePercent(activities),
        cells,
      });
    }

    const basis = effectiveBasis(zones, input.basis);
    const trades: Record<string, number | null> = {};
    for (const activity of input.activities) {
      trades[activity.key] = tradePercent(zoneInputs, activity.key, basis);
    }
    result.set(floorId, {
      floorId,
      percent: floorPercent(zoneInputs, basis) ?? 0,
      zones: zoneResults,
      trades,
    });
  }
  return result;
}
