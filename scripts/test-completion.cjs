/* eslint-disable @typescript-eslint/no-require-imports -- CommonJS test runner script */
/**
 * Unit tests for src/lib/progression/completion.ts (Definable Completion formula).
 * Run: npm run test:completion
 */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const jiti = require(path.join(root, "node_modules/jiti"))(__filename, {
  alias: { "@": path.join(root, "src") },
});
const c = jiti(path.join(root, "src/lib/progression/completion.ts"));

const close = (actual, expected, msg) =>
  assert.ok(Math.abs(actual - expected) < 1e-9, `${msg}: expected ${expected}, got ${actual}`);

const weights = { blockwork: 20, services: 15, plaster: 20, flooring: 20, paint: 25 };
const zone = (id, area, pcts, na = []) => ({
  id,
  name: id,
  area,
  activities: Object.entries(weights).map(([key, weight], i) => ({
    key,
    name: key,
    weight,
    percent: na.includes(key) ? null : pcts[i],
  })),
});

const flat301 = zone("Flat 301", 1200, [100, 100, 100, 50, 0]);
const flat302 = zone("Flat 302", 800, [100, 50, 0, 0, 0]);

test("reference: Flat 301 = 65%", () => {
  close(c.zonePercent(flat301.activities), 65, "Flat 301");
});

test("reference: Flat 302 = 27.5%", () => {
  close(c.zonePercent(flat302.activities), 27.5, "Flat 302");
});

test("reference: floor on area basis = 50%", () => {
  close(c.floorPercent([flat301, flat302], "area"), 50, "floor");
});

test("reference: planned 60% → variance −10 pts, behind 16.7%, Behind <20%", () => {
  const s = c.summarize(50, 60);
  close(s.variance, -10, "variance");
  close(s.behind, (10 / 60) * 100, "behind");
  assert.equal(s.status, "behind_lt20");
});

test("equal basis averages zones regardless of area", () => {
  close(c.floorPercent([flat301, flat302], "equal"), (65 + 27.5) / 2, "equal");
});

test("N/A activities are excluded and weights renormalised", () => {
  // Bedroom without waterproofing-like activity: drop 'services' (15) → weights 85.
  const z = zone("Bedroom", 100, [100, 0, 100, 0, 0], ["services"]);
  close(c.zonePercent(z.activities), ((20 + 20) / 85) * 100, "renormalised");
});

test("all activities N/A → zone is null and skipped in the floor", () => {
  const empty = zone("Shaft", 50, [0, 0, 0, 0, 0], Object.keys(weights));
  assert.equal(c.zonePercent(empty.activities), null);
  close(c.floorPercent([flat301, empty], "area"), 65, "skip N/A zone");
});

test("no observations → 0%", () => {
  const stages = [
    { key: "none", name: "Not started", credit: 0 },
    { key: "started", name: "Started", credit: 25 },
    { key: "half", name: "Half", credit: 50 },
    { key: "done", name: "Done", credit: 100 },
  ];
  assert.equal(c.activityPercentOnDate(stages, [], "2026-11-24"), 0);
});

test("unverified observations are ignored by default, counted when allowed", () => {
  const stages = [
    { key: "started", name: "Started", credit: 25 },
    { key: "done", name: "Done", credit: 100 },
  ];
  const obs = [
    { stageKey: "started", date: "2026-11-01", verified: true },
    { stageKey: "done", date: "2026-11-10", verified: false },
  ];
  assert.equal(c.activityPercentOnDate(stages, obs, "2026-11-24"), 25);
  assert.equal(c.activityPercentOnDate(stages, obs, "2026-11-24", false), 100);
});

test("observations after the date do not count", () => {
  const stages = [{ key: "done", name: "Done", credit: 100 }];
  const obs = [{ stageKey: "done", date: "2026-12-01", verified: true }];
  assert.equal(c.activityPercentOnDate(stages, obs, "2026-11-24"), 0);
});

test("planned % before start = 0, after end = 100, midway = 50", () => {
  assert.equal(c.plannedPercent("2026-01-01", "2026-02-01", "2026-03-01"), 0);
  assert.equal(c.plannedPercent("2026-04-01", "2026-02-01", "2026-03-01"), 100);
  close(c.plannedPercent("2026-01-11", "2026-01-01", "2026-01-21"), 50, "midway");
  assert.equal(c.plannedPercent("2026-01-11", null, "2026-01-21"), null);
});

test("status buckets", () => {
  assert.equal(c.scheduleStatus(100, 80), "complete");
  assert.equal(c.scheduleStatus(40, null), "no_schedule");
  assert.equal(c.scheduleStatus(70, 60), "ahead");
  assert.equal(c.scheduleStatus(0, 30), "not_started");
  assert.equal(c.scheduleStatus(30, 60), "behind_gte20");
});

test("trade % rolls one activity across zones with zone weights", () => {
  // Flooring: 50 on 1200 sq ft, 0 on 800 sq ft → 30%.
  close(c.tradePercent([flat301, flat302], "flooring", "area"), 30, "flooring");
});

test("formatPercent keeps a decimal only when needed", () => {
  assert.equal(c.formatPercent(27.5), "27.5%");
  assert.equal(c.formatPercent(65), "65%");
  assert.equal(c.formatPercent(49.96), "50%");
});

const adapter = jiti(path.join(root, "src/lib/progression/checklist-completion.ts"));

test("checklist adapter: floor % equals ended ÷ all steps (unchanged from before)", () => {
  const f = adapter.floorCompletion(
    {
      floorId: "F1",
      tracks: [
        { completed: 56, total: 56, plannedStart: null, plannedEnd: null },
        { completed: 20, total: 56, plannedStart: null, plannedEnd: null },
      ],
    },
    "2026-11-24"
  );
  close(f.actual, (76 / 112) * 100, "floor");
});

test("checklist adapter: unstarted floors count as 0% in the project", () => {
  const p = adapter.projectCompletion(
    [
      { floorId: "F1", tracks: [{ completed: 56, total: 56, plannedStart: null, plannedEnd: null }, { completed: 20, total: 56, plannedStart: null, plannedEnd: null }] },
      { floorId: "F2", tracks: [{ completed: 10, total: 56, plannedStart: null, plannedEnd: null }, { completed: 0, total: 56, plannedStart: null, plannedEnd: null }] },
      { floorId: "F3", tracks: [{ completed: 0, total: 56, plannedStart: null, plannedEnd: null }, { completed: 0, total: 56, plannedStart: null, plannedEnd: null }] },
    ],
    "2026-11-24"
  );
  // Audit worked example: 86 of 336 steps → 25.6%.
  close(p.actual, (86 / 336) * 100, "project");
  assert.equal(p.summary.status, "no_schedule");
});

test("checklist adapter: plan compares scheduled floors only", () => {
  const p = adapter.projectCompletion(
    [
      { floorId: "F1", tracks: [{ completed: 28, total: 56, plannedStart: "2026-11-01", plannedEnd: "2026-11-21" }] },
      { floorId: "F2", tracks: [{ completed: 0, total: 56, plannedStart: null, plannedEnd: null }] },
    ],
    "2026-11-11"
  );
  close(p.planned, 50, "planned");
  close(p.actual, 25, "actual over all floors");
  assert.equal(p.summary.status, "ahead"); // scheduled floor F1: 50% actual vs 50% planned
  assert.equal(p.scheduledFloorCount, 1);
});
