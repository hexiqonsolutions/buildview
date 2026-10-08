// Usage: npm run db:bundle -- 028 029   |   npm run db:bundle -- --from 019
import { readFileSync, writeFileSync } from "fs";
import { join, resolve } from "path";
import { ROOT_DIR } from "./lib/env.mjs";
import { MIGRATIONS_DIR, selectMigrations } from "./lib/migrations.mjs";

let files;
try {
  files = selectMigrations(process.argv.slice(2));
} catch (error) {
  console.error(error.message);
  process.exit(1);
}

const outputPath = resolve(ROOT_DIR, "supabase", "pending-apply.sql");

const header = `-- =============================================================================
-- BuildView — Migration bundle (${files[0]} … ${files.at(-1)})
-- =============================================================================
-- Paste into the Supabase SQL Editor when npm run db:apply is unavailable.
-- Regenerate: npm run db:bundle -- <numbers> | --from <number>
-- =============================================================================

`;

const sections = files.map((file) => {
  const sql = readFileSync(join(MIGRATIONS_DIR, file), "utf8").trim();
  return `-- ========== ${file} ==========\n\n${sql}\n`;
});

writeFileSync(outputPath, header + sections.join("\n"), "utf8");
console.log(`Wrote ${outputPath} (${files.length} migrations)`);
