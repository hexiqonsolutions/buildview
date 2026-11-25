/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Prints the SQL that seeds the construction-method checklist templates and
 * step keys from src/lib/progression/methods.ts (single source of truth).
 *   node scripts/generate-method-templates.cjs > out.sql
 */
const path = require("node:path");
const { createJiti } = require("jiti");

const jiti = createJiti(__filename, {
  alias: { "@": path.join(__dirname, "..", "src") },
});
const { CHECKLIST_TEMPLATES, DEFAULT_TRADES_BY_METHOD, stepKey } = jiti("../src/lib/progression/methods.ts");

const q = (s) => `'${String(s).replace(/'/g, "''")}'`;
const out = [];

for (const t of CHECKLIST_TEMPLATES) {
  out.push(`-- ${t.name} (${t.steps.length} steps)`);
  out.push(
    `INSERT INTO public.progression_templates (key, name, version, is_active, method, track)
VALUES (${q(t.key)}, ${q(t.name)}, 1, TRUE, ${q(t.method)}, ${q(t.track)})
ON CONFLICT (key) DO UPDATE SET method = EXCLUDED.method, track = EXCLUDED.track;`
  );
  const phaseByNumber = new Map(t.phases.map((p) => [p.number, p]));
  const used = new Set();
  const rows = t.steps.map((s) => {
    const p = phaseByNumber.get(s.phaseNumber);
    let key = stepKey(s.title);
    const base = key;
    let n = 2;
    while (used.has(key)) key = `${base}_${n++}`;
    used.add(key);
    return `(${s.stepNumber}, ${s.phaseNumber}, ${q(p.name)}, ${q(p.stage)}, ${q(s.title)}, ${q(key)})`;
  });
  out.push(
    `INSERT INTO public.progression_template_steps (template_id, step_number, phase_number, phase_name, phase_stage, title, step_key)
SELECT t.id, v.step_number, v.phase_number, v.phase_name, v.phase_stage, v.title, v.step_key
FROM public.progression_templates t,
(VALUES
  ${rows.join(",\n  ")}
) AS v(step_number, phase_number, phase_name, phase_stage, title, step_key)
WHERE t.key = ${q(t.key)}
ON CONFLICT (template_id, step_number) DO UPDATE SET step_key = EXCLUDED.step_key;`
  );
  out.push("");
}

out.push("-- Default trades per method (zones)");
for (const [method, trades] of Object.entries(DEFAULT_TRADES_BY_METHOD)) {
  if (method === "conventional") continue;
  out.push(
    `INSERT INTO public.completion_activities (project_id, method, key, name, weight, sort_order)
SELECT NULL, ${q(method)}, v.key, v.name, v.weight, v.sort_order
FROM (VALUES
  ${trades.map((tr, i) => `(${q(tr.key)}, ${q(tr.name)}, ${tr.weight}, ${i + 1})`).join(",\n  ")}
) AS v(key, name, weight, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM public.completion_activities a
  WHERE a.project_id IS NULL AND a.method = ${q(method)} AND a.key = v.key
);`
  );
}

process.stdout.write(out.join("\n") + "\n");
