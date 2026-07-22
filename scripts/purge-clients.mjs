/**
 * Soft-delete sample seed clients and/or all active clients for a clean retest.
 *
 * Usage:
 *   node scripts/purge-clients.mjs              # sample seed clients only
 *   node scripts/purge-clients.mjs --all        # every active client
 *   node scripts/purge-clients.mjs --list       # list active clients only
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, "..", ".env.local");

const SAMPLE_CLIENT_IDS = [
  "a0000000-0000-0000-0000-000000000001", // Meridian Development
  "a0000000-0000-0000-0000-000000000002", // Apex Construction Group
  "a0000000-0000-0000-0000-000000000003", // Design Collective
];

function loadEnv() {
  if (!existsSync(envPath)) {
    console.error("Missing .env.local");
    process.exit(1);
  }
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i === -1) continue;
    const k = t.slice(0, i).trim();
    let v = t.slice(i + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    if (!process.env[k]) process.env[k] = v;
  }
}

loadEnv();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Need NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const admin = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const args = process.argv.slice(2);
const listOnly = args.includes("--list");
const purgeAll = args.includes("--all");

const { data: clients, error: listError } = await admin
  .from("clients")
  .select("id, name, company_name, email")
  .is("deleted_at", null)
  .order("company_name");

if (listError) {
  console.error("Failed to list clients:", listError.message);
  process.exit(1);
}

const active = clients ?? [];
console.log(`Active clients: ${active.length}`);
for (const c of active) {
  console.log(`  - ${c.company_name || c.name} <${c.email}> (${c.id})`);
}

if (listOnly) process.exit(0);

const targets = purgeAll
  ? active
  : active.filter((c) => SAMPLE_CLIENT_IDS.includes(c.id));

if (targets.length === 0) {
  console.log(
    purgeAll
      ? "\nNo active clients to purge."
      : "\nNo sample seed clients found among active clients.\nRun with --all to remove every client."
  );
  process.exit(0);
}

console.log(
  `\nSoft-deleting ${targets.length} client(s)${purgeAll ? " (ALL)" : " (sample seed)"}...`
);

const now = new Date().toISOString();
const ids = targets.map((c) => c.id);

const { error: projectError } = await admin
  .from("projects")
  .update({ deleted_at: now })
  .in("client_id", ids)
  .is("deleted_at", null);

if (projectError) {
  console.error("Failed to soft-delete projects:", projectError.message);
  process.exit(1);
}

const { error: usersError } = await admin
  .from("users")
  .update({ client_id: null })
  .in("client_id", ids)
  .is("deleted_at", null);

if (usersError) {
  console.error("Failed to unlink users:", usersError.message);
  process.exit(1);
}

const { error: clientError } = await admin
  .from("clients")
  .update({ deleted_at: now, is_active: false })
  .in("id", ids)
  .is("deleted_at", null);

if (clientError) {
  console.error("Failed to soft-delete clients:", clientError.message);
  process.exit(1);
}

console.log("Done. Refresh /admin/clients — list should be clean for retesting.");
if (!purgeAll) {
  console.log("Tip: use --all if Hexiqon or other manual clients should also be removed.");
}
