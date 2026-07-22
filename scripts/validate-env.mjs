import { existsSync, readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, "..", ".env.local");

const required = [
  { key: "NEXT_PUBLIC_SUPABASE_URL", hint: "Supabase → Settings → API → Project URL" },
  { key: "NEXT_PUBLIC_SUPABASE_ANON_KEY", hint: "Supabase → Settings → API → anon key" },
  { key: "SUPABASE_SERVICE_ROLE_KEY", hint: "Supabase → Settings → API → service_role key" },
  { key: "NEXT_PUBLIC_APP_URL", hint: "http://localhost:3000 (local) or production URL" },
];

const recommended = [
  { key: "DATABASE_URL", hint: "Required for npm run db:apply — Database → Connection URI" },
  { key: "CRON_SECRET", hint: "Protects /api/internal/sync-users cron on Vercel" },
];

const optional = [
  "RESEND_API_KEY",
  "CONTACT_TO_EMAIL",
  "CONTACT_FROM_EMAIL",
  "NEXT_PUBLIC_GA_MEASUREMENT_ID",
  "NEXT_PUBLIC_CALENDLY_URL",
  "NEXT_PUBLIC_SITE_URL",
];

function loadEnv() {
  if (!existsSync(envPath)) {
    console.error("Missing .env.local — run: cp .env.example .env.local");
    return {};
  }

  const vars = {};
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
    vars[k] = v;
  }
  return vars;
}

const env = loadEnv();

console.log("BuildView environment check\n");

let errors = 0;
let warnings = 0;

for (const { key, hint } of required) {
  const value = env[key]?.trim();
  if (!value || value.includes("your-")) {
    console.log(`  ✗ ${key} — missing or placeholder (${hint})`);
    errors += 1;
  } else {
    console.log(`  ✓ ${key}`);
  }
}

console.log("");

for (const { key, hint } of recommended) {
  const value = env[key]?.trim();
  if (!value || value.includes("your-")) {
    console.log(`  ⚠ ${key} — not set (${hint})`);
    warnings += 1;
  } else {
    console.log(`  ✓ ${key}`);
  }
}

const setOptional = optional.filter((key) => env[key]?.trim() && !env[key].includes("your-"));
if (setOptional.length > 0) {
  console.log(`\nOptional integrations configured: ${setOptional.join(", ")}`);
}

console.log("");
if (errors > 0) {
  console.log(`${errors} required variable(s) need attention.`);
  process.exit(1);
}

if (warnings > 0) {
  console.log(`${warnings} recommended variable(s) missing — app works but some features need them.`);
} else {
  console.log("Environment looks ready for local development.");
}
