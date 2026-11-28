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

const step = (floorId, track, n, status, doneDate) => ({
  floorId, floorName: floorId, buildingName: "T", track, stepNumber: n, title: `Step ${n}`, status, doneDate,
});

test("progress on a date: only steps ended on/before the scan count", () => {
  const steps = [
    step("F1", "pre", 1, "completed", "2026-10-01"),
    step("F1", "pre", 2, "completed", "2026-10-20"),
    step("F1", "pre", 3, "in_progress", null),
    step("F1", "pre", 4, "pending", null),
    step("F2", "pre", 1, "pending", null),
    step("F2", "pre", 2, "pending", null),
    step("F2", "pre", 3, "pending", null),
    step("F2", "pre", 4, "pending", null),
  ];
  // Floor only: 1/4 on 10 Oct, 2/4 on 25 Oct.
  close(adapter.percentOnDate(steps, ["F1"], "2026-10-10"), 25, "F1 at scan A");
  close(adapter.percentOnDate(steps, ["F1"], "2026-10-25"), 50, "F1 at scan B");
  // Project (both floors, F2 unstarted = 0%): (50 + 0) / 2 = 25.
  close(adapter.percentOnDate(steps, ["F1", "F2"], "2026-10-25"), 25, "project");
  const between = adapter.stepsEndedBetween(steps, ["F1"], "2026-10-10", "2026-10-25");
  assert.deepEqual(between.map((s) => s.stepNumber), [2]);
});

const zones = jiti(path.join(root, "src/lib/progression/zone-completion.ts"));
const ACTS = [
  { key: "blockwork", name: "Blockwork", weight: 20 },
  { key: "services", name: "Services", weight: 15 },
  { key: "plaster", name: "Plaster", weight: 20 },
  { key: "flooring", name: "Flooring", weight: 20 },
  { key: "paint", name: "Paint", weight: 25 },
];
const STAGES = [
  { key: "not_started", name: "Not started", credit: 0 },
  { key: "started", name: "Started", credit: 25 },
  { key: "half", name: "Half", credit: 50 },
  { key: "done", name: "Done", credit: 100 },
];
let obsSeq = 0;
const ob = (zoneId, activityKey, stageKey, observedOn, verificationStatus = "verified", createdAt) => ({
  id: `o${++obsSeq}`, zoneId, activityKey, stageKey, observedOn,
  createdAt: createdAt ?? `${observedOn}T10:00:${String(obsSeq).padStart(2, "0")}Z`, verificationStatus,
});
const zoneRec = (id, area, naKeys = []) => ({ id, floorId: "F", name: id, zoneType: "flat", area, customWeight: null, naKeys });

test("zones: spec reference case from observations (65 / 27.5 / floor 50)", () => {
  const obs = [
    ob("301", "blockwork", "done", "2026-11-01"), ob("301", "services", "done", "2026-11-02"),
    ob("301", "plaster", "done", "2026-11-03"), ob("301", "flooring", "half", "2026-11-04"),
    ob("302", "blockwork", "done", "2026-11-01"), ob("302", "services", "half", "2026-11-02"),
  ];
  const floor = zones.computeZoneFloors({
    zones: [zoneRec("301", 1200), zoneRec("302", 800)], activities: ACTS, stages: STAGES,
    observations: obs, date: "2026-11-24", verifiedOnly: true, basis: "area",
  }).get("F");
  close(floor.zones[0].percent, 65, "301");
  close(floor.zones[1].percent, 27.5, "302");
  close(floor.percent, 50, "floor");
  close(floor.trades.flooring, 30, "flooring trade");
});

test("zones: rejected never counts; unverified counts only when allowed", () => {
  const obs = [
    ob("Z", "blockwork", "done", "2026-11-01", "rejected"),
    ob("Z", "paint", "half", "2026-11-02", null),
  ];
  const run = (verifiedOnly) => zones.computeZoneFloors({
    zones: [zoneRec("Z", 100)], activities: ACTS, stages: STAGES, observations: obs,
    date: "2026-11-24", verifiedOnly, basis: "area",
  }).get("F").zones[0];
  close(run(true).percent, 0, "verified only");
  close(run(false).percent, 12.5, "unverified paint half = 25*0.5");
  assert.equal(run(true).cells.paint.latestStatus, "pending");
});

test("zones: a same-day correction wins over an earlier higher stage", () => {
  const obs = [
    ob("Z", "plaster", "done", "2026-11-05", "verified", "2026-11-05T09:00:00Z"),
    ob("Z", "plaster", "half", "2026-11-05", "verified", "2026-11-05T17:00:00Z"),
  ];
  const z = zones.computeZoneFloors({
    zones: [zoneRec("Z", 100)], activities: ACTS, stages: STAGES, observations: obs,
    date: "2026-11-24", verifiedOnly: true, basis: "area",
  }).get("F").zones[0];
  assert.equal(z.cells.plaster.countedStageKey, "half");
});

test("zones: N/A excluded; area basis falls back to equal without areas", () => {
  const obs = [ob("A", "blockwork", "done", "2026-11-01"), ob("B", "blockwork", "done", "2026-11-01")];
  const floor = zones.computeZoneFloors({
    zones: [zoneRec("A", null, ["services", "plaster", "flooring", "paint"]), zoneRec("B", null)],
    activities: ACTS, stages: STAGES, observations: obs, date: "2026-11-24", verifiedOnly: true, basis: "area",
  }).get("F");
  close(floor.zones[0].percent, 100, "A only blockwork applies");
  close(floor.zones[1].percent, 20, "B");
  close(floor.percent, 60, "equal fallback");
});

test("checklist adapter: zoneActual replaces the checklist % for that floor", () => {
  const p = adapter.projectCompletion(
    [
      { floorId: "F1", zoneActual: 50, tracks: [{ completed: 0, total: 56, plannedStart: null, plannedEnd: null }] },
      { floorId: "F2", tracks: [{ completed: 56, total: 56, plannedStart: null, plannedEnd: null }] },
    ],
    "2026-11-24"
  );
  close(p.actual, 75, "project");
});

const scurve = jiti(path.join(root, "src/lib/progression/s-curve.ts"));

test("S-curve: actual rises with ended steps, planned follows the schedule, future has no actual", () => {
  const steps = [
    step("F1", "post", 1, "completed", "2026-01-08"),
    step("F1", "post", 2, "completed", "2026-01-22"),
    step("F1", "post", 3, "pending", null),
    step("F1", "post", 4, "pending", null),
  ];
  const points = scurve.buildSCurve({
    floors: [{ floorId: "F1", tracks: [{ track: "post", total: 4, plannedStart: "2026-01-01", plannedEnd: "2026-03-01" }] }],
    steps,
    today: "2026-02-01",
  });
  assert.equal(points[0].date, "2026-01-01");
  assert.equal(points.at(-1).date, "2026-03-01");
  const at = (d) => points.find((p) => p.date === d);
  close(at("2026-01-01").actual, 0, "start actual");
  close(at("2026-02-01").actual, 50, "today actual (2 of 4)");
  close(at("2026-03-01").planned, 100, "planned at end");
  assert.equal(at("2026-03-01").actual, null);
  // monotonic actual up to today
  const past = points.filter((p) => p.actual != null).map((p) => p.actual);
  assert.deepEqual([...past].sort((a, b) => a - b), past);
});

test("S-curve: no history → empty", () => {
  assert.deepEqual(scurve.buildSCurve({ floors: [], steps: [], today: "2026-02-01" }), []);
});

const tpl = jiti(path.join(root, "src/lib/progression/template.ts"));

test("template: weights must total 100 and stages rise from 0 to 100", () => {
  const good = tpl.validateTemplate({
    activities: [{ name: "Blockwork", weight: 40 }, { name: "Paint", weight: 60 }],
    stages: [{ name: "Not started", credit: 0 }, { name: "Half", credit: 50 }, { name: "Done", credit: 100 }],
  });
  assert.equal(good.ok, true);
  assert.deepEqual(good.template.activities.map((a) => a.key), ["blockwork", "paint"]);
  const bad = tpl.validateTemplate({
    activities: [{ name: "A", weight: 30 }, { name: "a", weight: 30 }],
    stages: [{ name: "Start", credit: 10 }, { name: "Done", credit: 90 }],
  });
  assert.equal(bad.ok, false);
  assert.ok(bad.errors.some((e) => e.includes("add up to 100")));
  assert.ok(bad.errors.some((e) => e.includes("different")));
  assert.ok(bad.errors.some((e) => e.includes("first stage")));
  assert.ok(bad.errors.some((e) => e.includes("last stage")));
});

test("template: existing keys are kept when a trade is renamed", () => {
  const r = tpl.validateTemplate({
    activities: [{ key: "blockwork", name: "Masonry", weight: 100 }],
    stages: [{ name: "No", credit: 0 }, { name: "Yes", credit: 100 }],
  });
  assert.equal(r.template.activities[0].key, "blockwork");
});

test("plans: CSV round-trip and validation", () => {
  const floors = [{ floorId: "F1", label: "Tower A · Floor 1" }];
  const acts = [{ key: "paint", name: "Paint", weight: 100 }];
  const csv = tpl.plansToCsv(floors, acts, [{ floorId: "F1", activityKey: "paint", start: "2026-01-01", end: "2026-02-01" }]);
  const parsed = tpl.parsePlanCsv(csv, floors, acts);
  assert.deepEqual(parsed.errors, []);
  assert.deepEqual(parsed.plans, [{ floorId: "F1", activityKey: "paint", start: "2026-01-01", end: "2026-02-01" }]);
  const bad = tpl.parsePlanCsv("Floor,Trade,Planned start,Planned end\nTower B · Floor 9,Paint,01/01/2026,31/01/2026\nTower A · Floor 1,Paint,31/02/2026,01/03/2026", floors, acts);
  assert.equal(bad.plans.length, 0);
  assert.equal(bad.errors.length, 2);
  assert.equal(tpl.parsePlanDate("15/03/2026"), "2026-03-15");
});

test("plans: floor planned % is weighted by trade", () => {
  const acts = [{ key: "a", weight: 25 }, { key: "b", weight: 75 }];
  const plans = [
    { floorId: "F", activityKey: "a", start: "2026-01-01", end: "2026-01-11" },
    { floorId: "F", activityKey: "b", start: "2026-02-01", end: "2026-03-01" },
  ];
  close(tpl.plannedFromActivityPlans(plans, acts, "F", "2026-01-06"), 12.5, "a half done, b not started");
  assert.equal(tpl.plannedFromActivityPlans(plans, acts, "G", "2026-01-06"), null);
});

// ---- construction methods (Conventional / Mivan / Hybrid)
const methods = jiti(path.join(root, "src/lib/progression/methods.ts"));

test("methods: floor override, then building, then project", () => {
  assert.equal(methods.effectiveMethod(null, null, "mivan"), "mivan");
  assert.equal(methods.effectiveMethod(null, "hybrid", "mivan"), "hybrid");
  assert.equal(methods.effectiveMethod("conventional", "hybrid", "mivan"), "conventional");
  assert.equal(methods.effectiveMethod(null, null, null), "conventional");
  assert.equal(methods.effectiveMethod("bogus", null, undefined), "conventional");
});

test("methods: template keys round-trip to their method", () => {
  for (const m of methods.CONSTRUCTION_METHODS) {
    for (const t of ["pre_slab", "post_slab"]) {
      assert.equal(methods.methodOfTemplateKey(methods.templateKeyFor(m, t)), m);
    }
  }
  assert.equal(methods.templateKeyFor("conventional", "post_slab"), "post_slab_v1");
});

test("methods: every checklist is well formed", () => {
  for (const t of methods.CHECKLIST_TEMPLATES) {
    assert.ok(t.steps.length > 10, `${t.key} has steps`);
    t.steps.forEach((s, i) => assert.equal(s.stepNumber, i + 1, `${t.key} numbering`));
    const phases = new Set(t.phases.map((p) => p.number));
    for (const s of t.steps) assert.ok(phases.has(s.phaseNumber), `${t.key} phase ${s.phaseNumber}`);
  }
  const keys = methods.CHECKLIST_TEMPLATES.map((t) => t.key);
  assert.equal(new Set(keys).size, keys.length);
});

test("methods: Mivan has no blockwork or plaster; hybrid has internal blockwork only", () => {
  const titles = (key) => methods.CHECKLIST_TEMPLATES.find((t) => t.key === key).steps.map((s) => s.title.toLowerCase());
  const mivan = titles("post_slab_mivan_v1");
  assert.ok(!mivan.some((t) => t.includes("blockwork") || /\bplaster\b/.test(t.replace("no plaster", ""))));
  assert.ok(titles("pre_slab_mivan_v1").some((t) => t.includes("walls and slab poured together")));
  const hybrid = titles("post_slab_hybrid_v1");
  assert.ok(hybrid.some((t) => t.includes("blockwork / aac partitions for internal walls")));
  assert.ok(!hybrid.some((t) => t.includes("external wall plaster")));
});

test("methods: shared finishing steps share keys with conventional (history carries over)", () => {
  const keys = (key) => new Set(methods.CHECKLIST_TEMPLATES.find((t) => t.key === key).steps.map((s) => methods.stepKey(s.title)));
  const conv = keys("post_slab_v1");
  const mivan = keys("post_slab_mivan_v1");
  const shared = [...mivan].filter((k) => conv.has(k));
  assert.ok(shared.length >= 25, `shared ${shared.length}`);
  assert.ok(shared.includes(methods.stepKey("Waterproofing upturns and pipe-junction treatment")));
});

test("methods: default trades sum to 100 per method", () => {
  for (const [m, trades] of Object.entries(methods.DEFAULT_TRADES_BY_METHOD)) {
    close(trades.reduce((s, t) => s + t.weight, 0), 100, m);
  }
  assert.ok(!methods.DEFAULT_TRADES_BY_METHOD.mivan.some((t) => t.key === "blockwork" || t.key === "plaster"));
});

test("methods: track labels, including mixed projects", () => {
  assert.equal(methods.trackLabel("pre_slab", "mivan"), "Structure cycle");
  assert.equal(methods.trackLabelFor("post_slab", ["conventional"]), "Post-Slab");
  assert.equal(methods.trackLabelFor("post_slab", ["conventional", "mivan", "hybrid"]), "Post-Slab / Finishing");
});

// ---- team notifications (WhatsApp defaults, quiet hours, digest)
const teamEvents = jiti(path.join(root, "src/lib/notifications/team-events.ts"));

test("team notifications: defaults keep routine activity in the digest", () => {
  assert.equal(teamEvents.whatsappModeFor("step_ended", {}), "digest");
  assert.equal(teamEvents.whatsappModeFor("scan_uploaded", {}), "instant");
  assert.equal(teamEvents.whatsappModeFor("comment_reply", undefined), "instant");
  assert.equal(teamEvents.whatsappModeFor("step_ended", { step_ended: "off" }), "off");
  assert.equal(teamEvents.whatsappModeFor("step_ended", { step_ended: "bogus" }), "digest");
});

test("team notifications: quiet hours hold instant messages until 8 am IST", () => {
  // 22:00 IST = 16:30 UTC → next day 08:00 IST = 02:30 UTC
  const late = new Date("2026-11-26T16:30:00Z");
  assert.equal(teamEvents.isQuietHours(late), true);
  assert.equal(teamEvents.sendAfterFor(late).toISOString(), "2026-11-27T02:30:00.000Z");
  // 06:00 IST = 00:30 UTC → same day 08:00 IST
  const early = new Date("2026-11-27T00:30:00Z");
  assert.equal(teamEvents.sendAfterFor(early).toISOString(), "2026-11-27T02:30:00.000Z");
  // 14:00 IST = 08:30 UTC → now
  const day = new Date("2026-11-27T08:30:00Z");
  assert.equal(teamEvents.isQuietHours(day), false);
  assert.equal(teamEvents.sendAfterFor(day).getTime(), day.getTime());
});

test("team notifications: digest counts per project with plurals", () => {
  const items = [
    { event: "step_ended", projectName: "Nahur", title: "" },
    { event: "step_ended", projectName: "Nahur", title: "" },
    { event: "step_started", projectName: "Nahur", title: "" },
    { event: "scan_uploaded", projectName: "Nahur", title: "" },
    { event: "comment", projectName: "Malhar", title: "" },
  ];
  const s = teamEvents.digestSummary(items);
  assert.deepEqual(s, [
    { projectName: "Nahur", line: "2 steps ended · 1 step started · 1 new scan" },
    { projectName: "Malhar", line: "1 comment" },
  ]);
});

// ---- traffic analytics classifiers
const cls = jiti(path.join(root, "src/lib/analytics/classify.ts"));

test("analytics: link previews and bots are not people", () => {
  assert.equal(cls.botSource("WhatsApp/2.23.20.0 A"), "WhatsApp");
  assert.equal(cls.botSource("facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)"), "Facebook");
  assert.equal(cls.botSource("Mozilla/5.0 (compatible; Googlebot/2.1)"), "Google");
  assert.equal(cls.botSource("curl/8.0"), "Other bot");
  assert.equal(cls.botSource(""), "Unknown bot");
  // People: mobile Chrome, Instagram in-app browser, iPhone Safari.
  assert.equal(cls.botSource("Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/125 Mobile Safari/537.36"), null);
  assert.equal(cls.botSource("Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Instagram 330.0.0"), null);
  assert.equal(cls.botSource("Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 Version/17.5 Mobile/15E148 Safari/604.1"), null);
});

test("analytics: device, referrer, UTM and source", () => {
  assert.equal(cls.deviceClass("Mozilla/5.0 (iPhone; CPU iPhone OS 17_5) Mobile"), "mobile");
  assert.equal(cls.deviceClass("Mozilla/5.0 (iPad; CPU OS 17_5)"), "tablet");
  assert.equal(cls.deviceClass("Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/125"), "desktop");
  assert.equal(cls.referrerHost("https://www.google.com/search?q=x"), "google.com");
  assert.equal(cls.referrerHost("https://buildview-tawny.vercel.app/about", "buildview-tawny.vercel.app"), null);
  const utm = cls.parseUtm("?utm_source=instagram&utm_medium=reel&utm_campaign=nov-launch");
  assert.deepEqual(utm, { source: "instagram", medium: "reel", campaign: "nov-launch" });
  assert.equal(cls.trafficSource(null, utm), "Instagram");
  assert.equal(cls.trafficSource("l.instagram.com", cls.parseUtm("")), "Instagram");
  assert.equal(cls.trafficSource(null, cls.parseUtm("")), "Direct");
  assert.equal(cls.isMarketingPath("/real-estate-showcase"), true);
  assert.equal(cls.isMarketingPath("/dashboard"), false);
  assert.equal(cls.clampSeconds(999), 60);
  assert.equal(cls.clampSeconds("abc"), 0);
});

const agg = jiti(path.join(root, "src/lib/analytics/aggregate.ts"));

test("analytics: link stats separate previews, count unlocks and returning", () => {
  const v = (o) => ({ share_id: "S", visitor_id: "a", is_preview: false, preview_source: null, visit_started_at: "2026-11-20T05:00:00Z", active_seconds: 0, unlocked_at: null, device: "mobile", country: "IN", referrer_host: null, ...o });
  const rows = [
    v({ visitor_id: "a", unlocked_at: "2026-11-20T05:01:00Z", active_seconds: 120 }),
    v({ visitor_id: "a", visit_started_at: "2026-11-22T05:00:00Z", unlocked_at: "2026-11-22T05:01:00Z", active_seconds: 60 }),
    v({ visitor_id: "b" }),
    v({ visitor_id: "bot:WhatsApp", is_preview: true, preview_source: "WhatsApp" }),
  ];
  const s = agg.linkStats(rows);
  assert.equal(s.opens, 3);
  assert.equal(s.unique, 2);
  assert.equal(s.unlocked, 1);
  close(s.unlockRate, 50, "unlock rate");
  close(s.avgSeconds, 90, "avg time");
  assert.equal(s.returning, 1);
  assert.equal(s.previews, 1);
  const daily = agg.dailyOpens(rows, agg.dayRange("2026-11-20", "2026-11-22"));
  assert.deepEqual(daily.map((d) => d.opens), [2, 0, 1]);
  assert.equal(agg.istDay("2026-11-20T20:00:00Z"), "2026-11-21");
  assert.equal(agg.toCsv(["a"], [["=cmd"]]), "a\r\n'=cmd");
});

// ---- progression v2 (weighted phases, Inside / Outside / Site)
const v2 = jiti(path.join(root, "src/lib/progression/v2-completion.ts"));
const lib2 = jiti(path.join(root, "src/lib/progression/library-v2.ts"));

test("v2 library: weights add to 100 per list and Inside sums to 100", () => {
  const byKey = Object.fromEntries(lib2.V2_TEMPLATES.map((t) => [t.key, t.phases.reduce((s, p) => s + p.weight, 0)]));
  for (const m of ["", "_mivan", "_hybrid"]) {
    close(byKey[`pre_slab${m}_v2`] + byKey[`post_slab${m}_v2`], 100, `inside${m}`);
    close(byKey[`external${m}_v2`], 100, `outside${m}`);
  }
  close(byKey.site_v2, 100, "site");
  const fin = lib2.V2_TEMPLATES.find((t) => t.key === "post_slab_v2");
  const wp = fin.phases.find((p) => p.name.startsWith("Waterproofing"));
  assert.ok(wp.steps.length >= 8 && wp.steps.every((s) => s.photo), "waterproofing expects photos");
  // Every v2 step key is unique within its list.
  for (const t of lib2.V2_TEMPLATES) {
    const keys = lib2.v2Rows(t).map((r) => r.stepKey);
    assert.equal(new Set(keys).size, keys.length, t.key);
  }
});

test("v2 %: phases weighted, N/A ignored, split across Inside / Outside / Site", () => {
  const step = (status, o = {}) => ({ status, doneDate: status === "completed" ? "2026-11-01" : null, verified: false, na: false, ...o });
  const floor = (id, phases) => ({ scope: "floor", floorId: id, buildingId: "B", track: "post_slab", plannedStart: null, plannedEnd: null, phases });
  // Floor F1: structure 30 all done; finishing 70 half done (one phase 70: 1 of 2 steps, 1 N/A).
  const lists = [
    floor("F1", [{ number: 1, weight: 30, steps: [step("completed")] }]),
    floor("F1", [{ number: 2, weight: 70, steps: [step("completed"), step("pending"), step("pending", { na: true })] }]),
    { scope: "building", floorId: null, buildingId: "B", track: "external", plannedStart: null, plannedEnd: null, phases: [{ number: 1, weight: 100, steps: [step("completed"), step("pending"), step("pending"), step("pending")] }] },
  ];
  const r = v2.v2ProjectCompletion({ checklists: lists, floorIds: ["F1", "F2"], buildingIds: ["B"], split: { inside: 70, outside: 20, site: 10 }, date: "2026-11-28" });
  close(r.floors[0].actual, 65, "F1 = 30 + 70×0.5");
  close(r.floors[1].actual, 0, "unstarted floor");
  close(r.parts.inside.actual, 32.5, "inside avg");
  close(r.parts.outside.actual, 25, "outside");
  // No site checklist → site left out, renormalised over 90.
  close(r.actual, (32.5 * 70 + 25 * 20) / 90, "project");
  // History: nothing done before Oct.
  const early = v2.v2ProjectCompletion({ checklists: lists, floorIds: ["F1"], buildingIds: ["B"], split: { inside: 70, outside: 20, site: 10 }, date: "2026-10-01", asOf: true });
  close(early.actual, 0, "as of Oct");
  assert.deepEqual(v2.normaliseSplit({ inside: "60", outside: 30 }), { inside: 60, outside: 30, site: 10 });
});
