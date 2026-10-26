/**
 * Smoke checks for email/WhatsApp notification wiring (no network calls).
 * Run: node scripts/check-notification-channels.mjs
 */
import { readEnvFile } from "./lib/env.mjs";

const fileVars = readEnvFile();
const env = { ...(fileVars ?? {}), ...process.env };

function isSet(key) {
  const value = env[key]?.trim();
  return Boolean(value) && !value.includes("your-");
}

function toE164Phone(input) {
  if (!input) return null;
  const trimmed = String(input).trim();
  if (!trimmed) return null;
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length < 10) return null;
  if (trimmed.startsWith("+") && digits.length >= 10 && digits.length <= 15) {
    return `+${digits}`;
  }
  if (digits.length === 10) return `+91${digits}`;
  if (digits.length === 12 && digits.startsWith("91")) return `+${digits}`;
  if (digits.length >= 11 && digits.length <= 15) return `+${digits}`;
  return null;
}

let failed = 0;

function assert(cond, msg) {
  if (!cond) {
    console.log(`  ✗ ${msg}`);
    failed += 1;
  } else {
    console.log(`  ✓ ${msg}`);
  }
}

console.log("Notification channel smoke check\n");

console.log("Phone E.164 normalization");
assert(toE164Phone("8655224990") === "+918655224990", "10-digit India → +91");
assert(toE164Phone("+91 86552 24990") === "+918655224990", "formatted +91");
assert(toE164Phone("") === null, "empty → null");

console.log("\nEmail (Resend)");
if (isSet("RESEND_API_KEY")) {
  console.log("  ✓ RESEND_API_KEY set");
} else {
  console.log("  ⚠ RESEND_API_KEY missing — emails silently skip until set on Vercel");
}
if (isSet("NOTIFICATION_FROM_EMAIL") || isSet("CONTACT_FROM_EMAIL")) {
  console.log("  ✓ From address configured (NOTIFICATION_FROM_EMAIL or CONTACT_FROM_EMAIL)");
} else {
  console.log("  ⚠ No FROM email — Resend may reject or use onboarding@resend.dev");
}

console.log("\nWhatsApp (Twilio) — critical rules only");
const waReady =
  isSet("TWILIO_ACCOUNT_SID") &&
  isSet("TWILIO_AUTH_TOKEN") &&
  isSet("TWILIO_WHATSAPP_FROM");
if (waReady) {
  console.log("  ✓ Twilio WhatsApp credentials present");
} else {
  console.log("  ⚠ Twilio not configured — WhatsApp channel will skip until set");
}

const templates = [
  "TWILIO_WA_TEMPLATE_CRITICAL_ISSUE",
  "TWILIO_WA_TEMPLATE_INVOICE_SENT",
  "TWILIO_WA_TEMPLATE_INVOICE_PAID",
  "TWILIO_WA_TEMPLATE_PROJECT_REMOVED",
];
const approved = templates.filter(isSet);
console.log(
  approved.length
    ? `  ✓ ${approved.length}/4 content template SIDs set`
    : "  ⚠ No content template SIDs — plain body only (sandbox / 24h session)"
);

console.log("\nOps checklist");
console.log("  1. Apply supabase/migrations/040_notification_preferences.sql");
console.log("  2. Confirm Admin → Settings → Integrations shows Notification email Active");
console.log("  3. Profile → Notifications → enable email → trigger an upload");
console.log("  4. Approve Twilio/Meta templates, set SIDs, opt in WhatsApp + phone");
console.log("");

if (failed > 0) {
  console.log(`${failed} check(s) failed.`);
  process.exit(1);
}

console.log("Smoke checks passed (config may still need Vercel secrets).");
