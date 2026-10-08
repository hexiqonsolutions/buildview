import { createClient } from "@supabase/supabase-js";
import { loadEnvFile } from "./lib/env.mjs";

loadEnvFile();

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY — run npm run env:check.");
  process.exit(1);
}

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// Only migrations that add a table, column, or bucket can be probed over the REST API.
// Function, policy, enum, and data migrations (020–023, 025, 026, 029) must be tracked manually.
const checks = [
  { name: "001 core schema", table: "projects" },
  { name: "004 project_comments", table: "project_comments" },
  { name: "008 buildings/floors", table: "buildings" },
  { name: "009 platform_settings", table: "platform_settings" },
  { name: "011 spatial scope cols", table: "documents", column: "building_id" },
  { name: "012 document_versions", table: "documents", column: "version_number" },
  { name: "013 spatial FK cols", table: "issues", column: "building_id" },
  { name: "014 tour spatial FK", table: "project_tours", column: "building_id" },
  { name: "015 saved_comparisons", table: "saved_comparisons" },
  { name: "016 timeline progress", table: "timeline_events", column: "progress_percent" },
  { name: "017 dashboard type", table: "clients", column: "dashboard_type" },
  { name: "018 portfolio fields", table: "projects", column: "portfolio_category" },
  { name: "019 project-covers bucket", bucket: "project-covers" },
  { name: "024 comment replies", table: "project_comments", column: "parent_id" },
  { name: "027 project_media", table: "project_media" },
  { name: "027 project-media bucket", bucket: "project-media" },
  { name: "028 rate_limits", table: "rate_limits", column: "key" },
];

async function probe(check) {
  if (check.bucket) {
    const { error } = await admin.storage.getBucket(check.bucket);
    return error;
  }
  const { error } = await admin.from(check.table).select(check.column ?? "*").limit(1);
  return error;
}

console.log("BuildView migration status\n");

let missing = 0;
for (const check of checks) {
  const error = await probe(check);
  if (error) missing += 1;
  console.log(`  ${check.name}: ${error ? `MISSING (${error.message})` : "OK"}`);
}

console.log("\n  Not detectable here — confirm in the SQL Editor: 020–023, 025, 026, 029");
console.log("");
if (missing > 0) {
  console.log(`${missing} check(s) failed.`);
  console.log("Apply with: npm run db:apply -- <numbers>   (requires DATABASE_URL)");
  console.log("Or paste the files into the Supabase SQL Editor — see DEPLOYMENT.md");
  process.exit(1);
}

console.log("All detectable migrations are applied.");
