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

if (!process.exitCode) {
  console.log("All progression stats checks passed.");
}
