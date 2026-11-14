/**
 * Regression checks for tour share view dedupe helpers (no test framework).
 * Mirrors src/lib/tour-shares/view-dedupe.ts — keep in sync when changing rules.
 *
 * Run: node scripts/test-tour-share-dedupe.mjs
 */

const VIEW_DEDUPE_WINDOW_MS = 24 * 60 * 60 * 1000;

function normalizeViewerEmail(email) {
  return email.trim().toLowerCase();
}

function shouldSkipDuplicateView({ existingCreatedAt, nowMs = Date.now(), windowMs = VIEW_DEDUPE_WINDOW_MS }) {
  if (!existingCreatedAt) return false;
  const created = new Date(existingCreatedAt).getTime();
  if (Number.isNaN(created)) return false;
  return nowMs - created < windowMs;
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    console.error(`FAIL ${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
    process.exitCode = 1;
    return;
  }
  console.log(`ok ${label}`);
}

assertEqual(normalizeViewerEmail("  Alex@Corp.COM "), "alex@corp.com", "normalize trims + lowercases");
assertEqual(normalizeViewerEmail("a@b.co"), "a@b.co", "normalize leaves already-clean email");

const now = Date.parse("2026-11-02T12:00:00.000Z");
const oneHourAgo = new Date(now - 60 * 60 * 1000).toISOString();
const twentyFiveHoursAgo = new Date(now - 25 * 60 * 60 * 1000).toISOString();

assertEqual(
  shouldSkipDuplicateView({ existingCreatedAt: oneHourAgo, nowMs: now }),
  true,
  "same email within 24h → skip"
);
assertEqual(
  shouldSkipDuplicateView({ existingCreatedAt: twentyFiveHoursAgo, nowMs: now }),
  false,
  "same email after 24h → allow new row"
);
assertEqual(
  shouldSkipDuplicateView({ existingCreatedAt: null, nowMs: now }),
  false,
  "no prior row → allow insert"
);
assertEqual(
  shouldSkipDuplicateView({ existingCreatedAt: "not-a-date", nowMs: now }),
  false,
  "invalid timestamp → do not skip"
);

// Distinct emails are never collapsed by this helper (caller compares emails).
const emailA = normalizeViewerEmail("one@example.com");
const emailB = normalizeViewerEmail("two@example.com");
assertEqual(emailA === emailB, false, "distinct emails stay distinct");

if (!process.exitCode) {
  console.log("\nAll tour-share dedupe checks passed.");
}
