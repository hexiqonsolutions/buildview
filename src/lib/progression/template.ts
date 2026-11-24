import { plannedPercent, weightedRollup } from "@/lib/progression/completion";

/**
 * Definable templates (Milestone 6): validation for trades / stages, the plan
 * CSV format, and planned % from per-trade plans. Pure and shared by the
 * editor (live checks) and the server (authoritative checks).
 */

export type TemplateActivityInput = { key?: string | null; name: string; weight: number };
export type TemplateStageInput = { key?: string | null; name: string; credit: number };

export type NormalizedTemplate = {
  activities: { key: string; name: string; weight: number; sortOrder: number }[];
  stages: { key: string; name: string; credit: number; sortOrder: number }[];
};

export function slugKey(name: string): string {
  return (
    name
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 40) || "item"
  );
}

/** Give every row a stable unique key (existing keys kept so history still matches). */
function withKeys<T extends { key?: string | null; name: string }>(rows: T[]): (T & { key: string })[] {
  const used = new Set<string>();
  return rows.map((row) => {
    let key = row.key?.trim() || slugKey(row.name);
    const base = key;
    let n = 2;
    while (used.has(key)) key = `${base}_${n++}`;
    used.add(key);
    return { ...row, key };
  });
}

export function validateTemplate(input: {
  activities: TemplateActivityInput[];
  stages: TemplateStageInput[];
}): { ok: true; template: NormalizedTemplate } | { ok: false; errors: string[] } {
  const errors: string[] = [];
  const acts = input.activities.map((a) => ({ ...a, name: a.name.trim() }));
  const stages = input.stages.map((s) => ({ ...s, name: s.name.trim() }));

  if (acts.length < 1) errors.push("Add at least one trade.");
  if (acts.length > 20) errors.push("Use at most 20 trades.");
  if (acts.some((a) => !a.name)) errors.push("Every trade needs a name.");
  const actNames = acts.map((a) => a.name.toLowerCase());
  if (new Set(actNames).size !== actNames.length) errors.push("Trade names must be different.");
  if (acts.some((a) => !Number.isFinite(a.weight) || a.weight < 0)) errors.push("Weights can't be negative.");
  const total = acts.reduce((s, a) => s + (Number.isFinite(a.weight) ? a.weight : 0), 0);
  if (Math.abs(total - 100) > 0.01) errors.push(`Weights must add up to 100% (now ${Math.round(total * 100) / 100}%).`);

  if (stages.length < 2) errors.push("Add at least two stages (e.g. Not started and Done).");
  if (stages.length > 8) errors.push("Use at most 8 stages.");
  if (stages.some((s) => !s.name)) errors.push("Every stage needs a name.");
  const stageNames = stages.map((s) => s.name.toLowerCase());
  if (new Set(stageNames).size !== stageNames.length) errors.push("Stage names must be different.");
  if (stages.length >= 2) {
    if (stages[0].credit !== 0) errors.push("The first stage must earn 0% (not started).");
    if (stages[stages.length - 1].credit !== 100) errors.push("The last stage must earn 100% (done).");
    for (let i = 1; i < stages.length; i++) {
      if (!(stages[i].credit > stages[i - 1].credit)) {
        errors.push("Each stage must earn more than the one before it.");
        break;
      }
    }
    if (stages.some((s) => s.credit < 0 || s.credit > 100)) errors.push("Stage credits must be between 0% and 100%.");
  }

  if (errors.length > 0) return { ok: false, errors };
  return {
    ok: true,
    template: {
      activities: withKeys(acts).map((a, i) => ({ key: a.key, name: a.name, weight: a.weight, sortOrder: i + 1 })),
      stages: withKeys(stages).map((s, i) => ({ key: s.key, name: s.name, credit: s.credit, sortOrder: i + 1 })),
    },
  };
}

// --------------------------------------------------------------- plans

export type ActivityPlan = { floorId: string; activityKey: string; start: string; end: string };

/** Floor planned % on a date from its trades' plans (weighted); null when none planned. */
export function plannedFromActivityPlans(
  plans: ActivityPlan[],
  activities: { key: string; weight: number }[],
  floorId: string,
  date: string
): number | null {
  const weight = new Map(activities.map((a) => [a.key, a.weight]));
  return weightedRollup(
    plans
      .filter((p) => p.floorId === floorId && weight.has(p.activityKey))
      .map((p) => ({ percent: plannedPercent(date, p.start, p.end), weight: weight.get(p.activityKey) ?? 0 }))
  );
}

const CSV_HEADER = ["Floor", "Trade", "Planned start", "Planned end"];

function csvCell(value: string): string {
  const safe = /^[=+\-@]/.test(value) ? `'${value}` : value;
  return /[",\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

/** One row per floor × trade (blank dates where not planned yet). */
export function plansToCsv(
  floors: { floorId: string; label: string }[],
  activities: { key: string; name: string }[],
  plans: ActivityPlan[]
): string {
  const byKey = new Map(plans.map((p) => [`${p.floorId}:${p.activityKey}`, p]));
  const rows = [CSV_HEADER.join(",")];
  for (const floor of floors) {
    for (const activity of activities) {
      const plan = byKey.get(`${floor.floorId}:${activity.key}`);
      rows.push([floor.label, activity.name, plan?.start ?? "", plan?.end ?? ""].map(csvCell).join(","));
    }
  }
  return rows.join("\r\n");
}

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else cur += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") {
      out.push(cur);
      cur = "";
    } else cur += ch;
  }
  out.push(cur);
  return out.map((c) => c.trim().replace(/^'(?=[=+\-@])/, ""));
}

/** YYYY-MM-DD, or DD/MM/YYYY and DD-MM-YYYY (Indian order). Null if invalid. */
export function parsePlanDate(value: string): string | null {
  const v = value.trim();
  let y: number, m: number, d: number;
  let match = v.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (match) [y, m, d] = [Number(match[1]), Number(match[2]), Number(match[3])];
  else if ((match = v.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/))) [d, m, y] = [Number(match[1]), Number(match[2]), Number(match[3])];
  else return null;
  const date = new Date(Date.UTC(y, m - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) return null;
  return date.toISOString().slice(0, 10);
}

/**
 * Parse an uploaded plan CSV (Floor, Trade, Planned start, Planned end).
 * Rows with both dates blank are skipped (left unplanned).
 */
export function parsePlanCsv(
  text: string,
  floors: { floorId: string; label: string }[],
  activities: { key: string; name: string }[]
): { plans: ActivityPlan[]; errors: string[] } {
  const floorByLabel = new Map(floors.map((f) => [f.label.trim().toLowerCase(), f.floorId]));
  const activityByName = new Map<string, string>();
  for (const a of activities) {
    activityByName.set(a.name.trim().toLowerCase(), a.key);
    activityByName.set(a.key.toLowerCase(), a.key);
  }
  const lines = text.replace(/^﻿/, "").split(/\r?\n/).filter((l) => l.trim() !== "");
  const plans: ActivityPlan[] = [];
  const errors: string[] = [];
  const seen = new Set<string>();
  lines.forEach((line, index) => {
    const cells = splitCsvLine(line);
    if (index === 0 && /floor/i.test(cells[0] ?? "") && /trade|activity/i.test(cells[1] ?? "")) return;
    const row = index + 1;
    const [floorLabel = "", tradeName = "", startRaw = "", endRaw = ""] = cells;
    if (!startRaw && !endRaw) return;
    const floorId = floorByLabel.get(floorLabel.toLowerCase());
    const activityKey = activityByName.get(tradeName.toLowerCase());
    const start = parsePlanDate(startRaw);
    const end = parsePlanDate(endRaw);
    if (!floorId) return void errors.push(`Row ${row}: unknown floor "${floorLabel}".`);
    if (!activityKey) return void errors.push(`Row ${row}: unknown trade "${tradeName}".`);
    if (!start || !end) return void errors.push(`Row ${row}: dates must be YYYY-MM-DD or DD/MM/YYYY.`);
    if (end < start) return void errors.push(`Row ${row}: planned end is before the start.`);
    const key = `${floorId}:${activityKey}`;
    if (seen.has(key)) return void errors.push(`Row ${row}: ${floorLabel} · ${tradeName} appears twice.`);
    seen.add(key);
    plans.push({ floorId, activityKey, start, end });
  });
  return { plans, errors };
}
