/* eslint-disable @typescript-eslint/no-require-imports */
/** Prints the SQL that seeds progression v2 templates from src/lib/progression/library-v2.ts. */
const path = require("node:path");
const { createJiti } = require("jiti");

const jiti = createJiti(__filename, { alias: { "@": path.join(__dirname, "..", "src") } });
const { V2_TEMPLATES, v2Rows } = jiti("../src/lib/progression/library-v2.ts");

const q = (s) => `'${String(s).replace(/'/g, "''")}'`;
const arr = (a) => (a.length ? `ARRAY[${a.map(q).join(", ")}]::text[]` : "ARRAY[]::text[]");
const out = [];

for (const t of V2_TEMPLATES) {
  const rows = v2Rows(t);
  out.push(`-- ${t.name} (${rows.length} steps)`);
  out.push(
    `INSERT INTO public.progression_templates (key, name, version, is_active, method, track, base_key)
VALUES (${q(t.key)}, ${q(t.name)}, 2, TRUE, ${q(t.method === "any" ? "conventional" : t.method)}, ${q(t.track)}, ${q(t.key)})
ON CONFLICT (key) DO UPDATE SET name = EXCLUDED.name, version = 2, method = EXCLUDED.method, track = EXCLUDED.track, base_key = EXCLUDED.base_key;`
  );
  out.push(
    `INSERT INTO public.progression_template_steps
  (template_id, step_number, phase_number, phase_name, phase_stage, title, step_key, phase_weight, alias_keys, photo_expected)
SELECT t.id, v.step_number, v.phase_number, v.phase_name, v.phase_stage, v.title, v.step_key, v.phase_weight, v.alias_keys, v.photo_expected
FROM public.progression_templates t,
(VALUES
  ${rows
    .map((r) => `(${r.stepNumber}, ${r.phaseNumber}, ${q(r.phaseName)}, ${q(r.phaseStage)}, ${q(r.title)}, ${q(r.stepKey)}, ${r.phaseWeight}, ${arr(r.aliasKeys)}, ${r.photo})`)
    .join(",\n  ")}
) AS v(step_number, phase_number, phase_name, phase_stage, title, step_key, phase_weight, alias_keys, photo_expected)
WHERE t.key = ${q(t.key)}
ON CONFLICT (template_id, step_number) DO UPDATE SET
  phase_number = EXCLUDED.phase_number, phase_name = EXCLUDED.phase_name, phase_stage = EXCLUDED.phase_stage,
  title = EXCLUDED.title, step_key = EXCLUDED.step_key, phase_weight = EXCLUDED.phase_weight,
  alias_keys = EXCLUDED.alias_keys, photo_expected = EXCLUDED.photo_expected;`
  );
  out.push("");
}
process.stdout.write(out.join("\n") + "\n");
