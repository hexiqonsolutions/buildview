/**
 * Minimal regression checks for progression % math (no test framework).
 * Run: node scripts/test-progression-stats.mjs
 */

function overallPercent(completed, total) {
  if (total <= 0) return 0;
  return Math.round((completed / total) * 100);
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    console.error(`FAIL ${label}: expected ${expected}, got ${actual}`);
    process.exitCode = 1;
    return;
  }
  console.log(`ok ${label}`);
}

assertEqual(overallPercent(0, 0), 0, "empty checklist → 0");
assertEqual(overallPercent(0, 55), 0, "zero completed");
assertEqual(overallPercent(55, 55), 100, "all complete");
assertEqual(overallPercent(1, 55), 2, "1/55 rounds to 2");
assertEqual(overallPercent(27, 55), 49, "27/55 rounds to 49");

// Pre/Post-Slab Start/End semantics: only Ended (completed) steps count.
// A step is activated when it has Started (in_progress) or Ended (completed).
function trackPercent(steps) {
  const ended = steps.filter((s) => s === "completed").length;
  return overallPercent(ended, steps.length);
}
function isActivated(steps) {
  return steps.some((s) => s === "in_progress" || s === "completed");
}

assertEqual(trackPercent(["in_progress", "pending"]), 0, "in-progress contributes 0%");
assertEqual(trackPercent(["completed", "in_progress", "pending"]), 33, "only ended counts (1/3)");
assertEqual(trackPercent(Array(56).fill("completed")), 100, "full 56-step track ended");
assertEqual(isActivated(["pending", "pending"]), false, "untouched floor not activated");
assertEqual(isActivated(["in_progress"]), true, "started floor activated at 0%");
// Both tracks pooled per floor: 56 pre + 56 post = 112 steps once seeded.
assertEqual(
  overallPercent(56 + 28, 112),
  75,
  "combined tracks pool ended steps (84/112)"
);

function assertTrue(value, label) {
  if (!value) {
    console.error(`FAIL ${label}: expected truthy`);
    process.exitCode = 1;
    return;
  }
  console.log(`ok ${label}`);
}

// Start/End transition guard shape (mirrors conditional-update actions):
// start only from pending, end only from in_progress, reset from either active state.
function canTransition(from, action) {
  if (action === "start") return from === "pending";
  if (action === "end") return from === "in_progress";
  if (action === "reset") return from === "in_progress" || from === "completed";
  return false;
}
assertTrue(canTransition("pending", "start"), "start allowed from pending");
assertTrue(!canTransition("in_progress", "start"), "double Start is a no-op (no duplicate Timeline)");
assertTrue(canTransition("in_progress", "end"), "end allowed from in_progress");
assertTrue(!canTransition("pending", "end"), "end blocked before start");
assertTrue(canTransition("completed", "reset"), "reset allowed after end");

if (!process.exitCode) {
  console.log("All progression stats checks passed.");
}
