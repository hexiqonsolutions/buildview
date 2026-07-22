import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const migrationsDir = resolve(__dirname, "..", "supabase", "migrations");
const outputPath = resolve(__dirname, "..", "supabase", "pending-apply.sql");

const pendingFiles = [
  "004_project_comments.sql",
  "008_buildings_floors.sql",
  "009_platform_settings.sql",
  "010_buildings_staff_rls.sql",
  "011_content_spatial_scope.sql",
  "012_document_versions.sql",
  "013_spatial_fk_columns.sql",
  "014_tour_spatial_fk.sql",
  "015_saved_comparisons.sql",
];

const header = `-- =============================================================================
-- BuildView — Pending migrations bundle (004 + 008–015)
-- =============================================================================
-- Run in Supabase SQL Editor if npm run db:apply is unavailable.
-- Regenerate: npm run db:bundle
-- =============================================================================

`;

const sections = pendingFiles.map((file) => {
  const sql = readFileSync(join(migrationsDir, file), "utf8").trim();
  return `-- ========== ${file} ==========\n\n${sql}\n`;
});

writeFileSync(outputPath, header + sections.join("\n"), "utf8");
console.log(`Wrote ${outputPath} (${pendingFiles.length} migrations)`);
