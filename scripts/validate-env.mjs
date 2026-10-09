import { readEnvFile } from "./lib/env.mjs";

const required = [
  { key: "NEXT_PUBLIC_SUPABASE_URL", hint: "Supabase → Settings → API → Project URL" },
  { key: "NEXT_PUBLIC_SUPABASE_ANON_KEY", hint: "Supabase → Settings → API → anon key" },
  { key: "SUPABASE_SERVICE_ROLE_KEY", hint: "Supabase → Settings → API → service_role key" },
  { key: "NEXT_PUBLIC_APP_URL", hint: "http://localhost:3000 (local) or the production URL" },
];

const recommended = [
  { key: "DATABASE_URL", hint: "Needed for npm run db:apply — Database → Connection URI" },
  { key: "CRON_SECRET", hint: "Without it /api/internal/sync-users rejects every request" },
  { key: "NEXT_PUBLIC_SITE_URL", hint: "Canonical URL for SEO and email links; falls back to NEXT_PUBLIC_APP_URL" },
];

const optional = [
  "RESEND_API_KEY",
  "CONTACT_TO_EMAIL",
  "CONTACT_FROM_EMAIL",
  "NOTIFICATION_FROM_EMAIL",
  "NEXT_PUBLIC_GA_MEASUREMENT_ID",
  "NEXT_PUBLIC_CALENDLY_URL",
  "NEXT_PUBLIC_META_PIXEL_ID",
  "META_CAPI_ACCESS_TOKEN",
  "RATE_LIMIT_ENABLED",
  "RATE_LIMIT_STORE",
  "SUPABASE_ACCESS_TOKEN",
  "SUPABASE_STORAGE_QUOTA_GB",
];

const fileVars = readEnvFile();
if (!fileVars) console.log("No .env.local found — checking the process environment only.\n");
const env = { ...(fileVars ?? {}), ...process.env };

const isSet = (key) => {
  const value = env[key]?.trim();
  return Boolean(value) && !value.includes("your-");
};

console.log("BuildView environment check\n");

let errors = 0;
for (const { key, hint } of required) {
  if (isSet(key)) {
    console.log(`  ✓ ${key}`);
  } else {
    console.log(`  ✗ ${key} — missing or placeholder (${hint})`);
    errors += 1;
  }
}

console.log("");

let warnings = 0;
for (const { key, hint } of recommended) {
  if (isSet(key)) {
    console.log(`  ✓ ${key}`);
  } else {
    console.log(`  ⚠ ${key} — not set (${hint})`);
    warnings += 1;
  }
}

if (isSet("META_CAPI_ACCESS_TOKEN") && Object.keys(env).some((k) => k.startsWith("NEXT_PUBLIC_") && env[k] === env.META_CAPI_ACCESS_TOKEN)) {
  console.log("\n  ✗ META_CAPI_ACCESS_TOKEN is duplicated in a NEXT_PUBLIC_* variable and would ship to the browser.");
  errors += 1;
}

const configured = optional.filter(isSet);
if (configured.length > 0) {
  console.log(`\nOptional integrations configured: ${configured.join(", ")}`);
}

console.log("");
if (errors > 0) {
  console.log(`${errors} required variable(s) need attention.`);
  process.exit(1);
}

console.log(
  warnings > 0
    ? `${warnings} recommended variable(s) missing — the app runs, but some features need them.`
    : "Environment looks ready."
);
