import { existsSync, readFileSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

export const ROOT_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
export const ENV_FILE = resolve(ROOT_DIR, ".env.local");

/** Parses .env.local into an object; returns null when the file is missing. */
export function readEnvFile() {
  if (!existsSync(ENV_FILE)) return null;
  const vars = {};
  for (const line of readFileSync(ENV_FILE, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    vars[key] = value;
  }
  return vars;
}

/** Copies .env.local into process.env without overriding variables already set (CI, Vercel). */
export function loadEnvFile() {
  const vars = readEnvFile() ?? {};
  for (const [key, value] of Object.entries(vars)) {
    if (!process.env[key]) process.env[key] = value;
  }
  return vars;
}
