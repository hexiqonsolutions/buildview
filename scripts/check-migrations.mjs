import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, "..", ".env.local");

function loadEnv() {
  if (!existsSync(envPath)) {
    console.error("Missing .env.local — copy from .env.example first.");
    process.exit(1);
  }
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i === -1) continue;
    const k = t.slice(0, i).trim();
    let v = t.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    if (!process.env[k]) process.env[k] = v;
  }
}

loadEnv();

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const checks = [
  { name: "001 core schema", table: "projects" },
  { name: "004 project_comments", table: "project_comments" },
  { name: "007 extended roles", table: "users", column: "role" },
  { name: "008 buildings/floors", table: "buildings" },
  { name: "009 platform_settings", table: "platform_settings" },
  { name: "011 spatial scope cols", table: "documents", column: "building_id" },
  { name: "012 document_versions", table: "documents", column: "version_number" },
  { name: "013 spatial FK cols", table: "issues", column: "building_id" },
  { name: "014 tour spatial FK", table: "project_tours", column: "building_id" },
  { name: "015 saved_comparisons", table: "saved_comparisons" },
];

console.log("BuildView migration status\n");

let missing = 0;
for (const check of checks) {
  const query = admin.from(check.table).select(check.column ?? "id").limit(1);
  const { error } = await query;
  const status = error ? `MISSING (${error.message})` : "OK";
  if (error) missing += 1;
  console.log(`  ${check.name}: ${status}`);
}

console.log("");
if (missing > 0) {
  console.log(`${missing} migration(s) not applied.`);
  console.log("Run: npm run db:apply  (requires DATABASE_URL in .env.local)");
  console.log("Or apply manually via Supabase SQL Editor — see DEPLOYMENT.md");
  process.exit(1);
}

console.log("All checked migrations are applied.");
