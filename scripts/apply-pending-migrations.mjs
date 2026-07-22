import { readFileSync, existsSync, readdirSync } from "fs";
import { resolve, dirname, join } from "path";
import { fileURLToPath } from "url";
import pg from "pg";

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, "..", ".env.local");

function loadEnv() {
  if (!existsSync(envPath)) throw new Error("Missing .env.local");
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

const databaseUrl = process.env.DATABASE_URL ?? process.env.SUPABASE_DB_URL;
if (!databaseUrl) {
  console.error(
    "Missing DATABASE_URL in .env.local.\n" +
      "Supabase Dashboard → Project Settings → Database → Connection string (URI).\n" +
      "Then run: npm run db:apply"
  );
  process.exit(1);
}

const pending = [
  "004_project_comments.sql",
  "008_buildings_floors.sql",
  "009_platform_settings.sql",
  "010_buildings_staff_rls.sql",
  "011_content_spatial_scope.sql",
  "012_document_versions.sql",
  "013_spatial_fk_columns.sql",
  "014_tour_spatial_fk.sql",
  "015_saved_comparisons.sql",
  "016_timeline_progress_fields.sql",
  "017_client_dashboard_type.sql",
  "018_project_portfolio_fields.sql",
];
const migrationsDir = resolve(__dirname, "..", "supabase", "migrations");

const client = new pg.Client({ connectionString: databaseUrl, ssl: { rejectUnauthorized: false } });

try {
  await client.connect();
  console.log("Connected. Applying pending migrations…");

  for (const file of pending) {
    const path = join(migrationsDir, file);
    const sql = readFileSync(path, "utf8");
    console.log(`→ ${file}`);
    await client.query(sql);
    console.log(`  ✓ ${file}`);
  }

  console.log("Done.");
} catch (error) {
  console.error("Migration failed:", error instanceof Error ? error.message : error);
  process.exit(1);
} finally {
  await client.end();
}
