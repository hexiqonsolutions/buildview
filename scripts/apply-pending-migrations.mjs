// Usage: npm run db:apply -- 028 029   |   npm run db:apply -- --from 019
import { readFileSync } from "fs";
import { join } from "path";
import pg from "pg";
import { loadEnvFile } from "./lib/env.mjs";
import { MIGRATIONS_DIR, selectMigrations } from "./lib/migrations.mjs";

loadEnvFile();

let files;
try {
  files = selectMigrations(process.argv.slice(2));
} catch (error) {
  console.error(error.message);
  process.exit(1);
}

const databaseUrl = process.env.DATABASE_URL ?? process.env.SUPABASE_DB_URL;
if (!databaseUrl) {
  console.error(
    "Missing DATABASE_URL in .env.local.\n" +
      "Supabase Dashboard → Project Settings → Database → Connection string (URI)."
  );
  process.exit(1);
}

const client = new pg.Client({ connectionString: databaseUrl, ssl: { rejectUnauthorized: false } });

try {
  await client.connect();
  console.log(`Connected. Applying ${files.length} migration(s)…`);

  for (const file of files) {
    console.log(`→ ${file}`);
    await client.query(readFileSync(join(MIGRATIONS_DIR, file), "utf8"));
    console.log(`  ✓ ${file}`);
  }

  console.log("Done.");
} catch (error) {
  console.error("Migration failed:", error instanceof Error ? error.message : error);
  process.exit(1);
} finally {
  await client.end();
}
