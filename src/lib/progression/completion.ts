/**
 * Definable Completion: the one formula module.
 *
 * Pure TypeScript, no database access, so the same numbers feed the UI, PDF,
 * API and unit tests. Every value is a raw percentage (0–100, not rounded);
 * callers round only for display.
 *
 *   Activity % = credit of the latest counted stage on or before the date (0 if none)
 *   Zone %     = Σ(weight_a × activity%_a) ÷ Σ(weight_a)   over applicable activities (N/A excluded)
 *   Floor %    = Σ(zone% × zone_weight) ÷ Σ(zone_weight)     zone_weight = area | 1 | custom
 *   Building % = same roll-up over floors; Project % = same roll-up over buildings
 *   Trade %    = one activity rolled up across zones with the same zone weights
 *
 *   Planned %  = clamp((date − start) ÷ (end − start), 0, 1) × 100
 *   Variance   = Actual % − Planned %          (percentage points)
 *   Status     = Complete | Ahead | Behind <20% | Behind ≥20% | Not started | No schedule
 *                where "Behind x%" = (Planned − Actual) ÷ Planned
 */

export type RollupBasis = "area" | "equal" | "custom";

/** A weighted value. `percent: null` means not applicable (excluded, weights renormalised). */
export type Weighted = { percent: number | null; weight: number };

export type ActivityInput = {
  key: string;
  name: string;
  /** Share of the activity in a location; need not sum to 100 (renormalised). */
  weight: number;
  /** Actual % (0–100), or null when the activity is N/A for this location. */
  percent: number | null;
};

export type ZoneInput = {
  id: string;
  name: string;
  /** Area in sq ft (used with the "area" basis). */
  area?: number | null;
  /** Custom weight (used with the "custom" basis). */
  customWeight?: number | null;
  activities: ActivityInput[];
};

export type StageDefinition = {
  key: string;
  name: string;
  /** Cumulative credit (0–100) earned when this stage is reached. */
  credit: number;
};

export type Observation = {
  stageKey: string;
  /** Calendar date of the observed work (YYYY-MM-DD or ISO). */
  date: string;
  verified: boolean;
};

export type ScheduleStatus =
  | "complete"
  | "ahead"
  | "behind_lt20"
  | "behind_gte20"
  | "not_started"
  | "no_schedule";

export const SCHEDULE_STATUS_LABELS: Record<ScheduleStatus, string> = {
  complete: "Complete",
  ahead: "On track",
  behind_lt20: "Behind <20%",
  behind_gte20: "Behind ≥20%",
  not_started: "Not started",
  no_schedule: "No schedule",
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/**
 * Weighted average of applicable items. Items with `percent: null` or a
 * non-positive weight are excluded and the remaining weights renormalised.
 * Returns null when nothing is applicable.
 */
export function weightedRollup(items: Weighted[]): number | null {
  let weightSum = 0;
  let valueSum = 0;
  for (const item of items) {
    if (item.percent == null || !Number.isFinite(item.percent)) continue;
    if (!(item.weight > 0)) continue;
    weightSum += item.weight;
    valueSum += item.weight * clamp(item.percent, 0, 100);
  }
  return weightSum > 0 ? valueSum / weightSum : null;
}

/** Zone % over applicable activities. Null when every activity is N/A. */
export function zonePercent(activities: ActivityInput[]): number | null {
  return weightedRollup(activities.map((a) => ({ percent: a.percent, weight: a.weight })));
}

export function zoneWeight(zone: ZoneInput, basis: RollupBasis): number {
  if (basis === "equal") return 1;
  if (basis === "custom") return zone.customWeight != null && zone.customWeight > 0 ? zone.customWeight : 0;
  return zone.area != null && zone.area > 0 ? zone.area : 0;
}

/** Floor % from its zones. Zones with no applicable activity are skipped. */
export function floorPercent(zones: ZoneInput[], basis: RollupBasis = "area"): number | null {
  return weightedRollup(
    zones.map((zone) => ({ percent: zonePercent(zone.activities), weight: zoneWeight(zone, basis) }))
  );
}

/** Trade %: one activity across zones, using the same zone weights. */
export function tradePercent(
  zones: ZoneInput[],
  activityKey: string,
  basis: RollupBasis = "area"
): number | null {
  return weightedRollup(
    zones.map((zone) => ({
      percent: zone.activities.find((a) => a.key === activityKey)?.percent ?? null,
      weight: zoneWeight(zone, basis),
    }))
  );
}

/**
 * Activity % on a date: credit of the latest counted stage observed on or
 * before `date`. With `verifiedOnly`, unverified observations are ignored.
 */
export function activityPercentOnDate(
  stages: StageDefinition[],
  observations: Observation[],
  date: string,
  verifiedOnly = true
): number {
  const day = date.slice(0, 10);
  const creditByStage = new Map(stages.map((s) => [s.key, s.credit]));
  let latest: { date: string; credit: number } | null = null;
  for (const obs of observations) {
    if (verifiedOnly && !obs.verified) continue;
    const obsDay = obs.date.slice(0, 10);
    if (obsDay > day) continue;
    const credit = creditByStage.get(obs.stageKey);
    if (credit == null) continue;
    if (!latest || obsDay > latest.date || (obsDay === latest.date && credit > latest.credit)) {
      latest = { date: obsDay, credit };
    }
  }
  return latest ? clamp(latest.credit, 0, 100) : 0;
}

function dayNumber(date: string): number {
  const [y, m, d] = date.slice(0, 10).split("-").map(Number);
  return Date.UTC(y, m - 1, d) / 86_400_000;
}

/** Planned % on `date` for a start–end window. Null when either date is missing. */
export function plannedPercent(
  date: string,
  plannedStart: string | null | undefined,
  plannedEnd: string | null | undefined
): number | null {
  if (!plannedStart || !plannedEnd) return null;
  const start = dayNumber(plannedStart);
  const end = dayNumber(plannedEnd);
  const today = dayNumber(date);
  if (end <= start) return today >= end ? 100 : 0;
  return clamp((today - start) / (end - start), 0, 1) * 100;
}

/** Actual − planned, in percentage points. Null without a schedule. */
export function scheduleVariance(actual: number, planned: number | null): number | null {
  return planned == null ? null : actual - planned;
}

/** "Behind x%" = (planned − actual) ÷ planned, as a percentage. */
export function behindPercent(actual: number, planned: number | null): number | null {
  if (planned == null || planned <= 0) return null;
  return ((planned - actual) / planned) * 100;
}

export function scheduleStatus(actual: number, planned: number | null): ScheduleStatus {
  if (actual >= 100) return "complete";
  if (planned == null) return "no_schedule";
  if (actual <= 0 && planned <= 0) return "not_started";
  if (actual >= planned) return "ahead";
  if (actual <= 0) return "not_started";
  const behind = behindPercent(actual, planned) ?? 0;
  return behind < 20 ? "behind_lt20" : "behind_gte20";
}

export type CompletionSummary = {
  actual: number;
  planned: number | null;
  variance: number | null;
  behind: number | null;
  status: ScheduleStatus;
};

export function summarize(actual: number, planned: number | null): CompletionSummary {
  return {
    actual,
    planned,
    variance: scheduleVariance(actual, planned),
    behind: behindPercent(actual, planned),
    status: scheduleStatus(actual, planned),
  };
}

/** Round for display (one decimal kept only when it matters, e.g. 27.5). */
export function formatPercent(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  const rounded = Math.round(value * 10) / 10;
  return `${Number.isInteger(rounded) ? rounded.toFixed(0) : rounded.toFixed(1)}%`;
}
