/**
 * Lightweight smoke checks for public tour share links (no DB required).
 * Run: node scripts/smoke-tour-shares.mjs
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const required = [
  "supabase/migrations/041_tour_shares.sql",
  "src/lib/actions/tour-shares.ts",
  "src/app/share/tours/[token]/page.tsx",
  "src/components/share/tour-share-viewer.tsx",
  "src/components/share/share-tour-dialog.tsx",
];

let failed = false;

for (const rel of required) {
  const path = resolve(root, rel);
  if (!existsSync(path)) {
    console.error(`MISSING ${rel}`);
    failed = true;
    continue;
  }
  console.log(`ok  ${rel}`);
}

const migration = readFileSync(resolve(root, "supabase/migrations/041_tour_shares.sql"), "utf8");
for (const needle of [
  "CREATE TABLE IF NOT EXISTS public.tour_shares",
  "CREATE TABLE IF NOT EXISTS public.tour_share_views",
  "tour_shares_select_access",
  "tour_share_views_select_access",
]) {
  if (!migration.includes(needle)) {
    console.error(`MIGRATION missing: ${needle}`);
    failed = true;
  } else {
    console.log(`ok  migration has ${needle}`);
  }
}

const routes = readFileSync(resolve(root, "src/lib/auth/routes.ts"), "utf8");
if (!routes.includes('"/share"')) {
  console.error("routes.ts missing /share public prefix");
  failed = true;
} else {
  console.log("ok  PUBLIC_ROUTE_PREFIXES includes /share");
}

const actions = readFileSync(resolve(root, "src/lib/actions/tour-shares.ts"), "utf8");
for (const fn of [
  "createTourShare",
  "revokeTourShare",
  "getTourShareViewers",
  "recordTourShareView",
]) {
  if (!actions.includes(`export async function ${fn}`)) {
    console.error(`actions missing ${fn}`);
    failed = true;
  } else {
    console.log(`ok  action ${fn}`);
  }
}

if (failed) {
  console.error("\nSmoke failed.");
  process.exit(1);
}
console.log("\nSmoke passed (static). Apply 041_tour_shares.sql in Supabase, then manually: create → open /share/tours/TOKEN → viewers → revoke.");
