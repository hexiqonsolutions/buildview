import { readdirSync } from "fs";
import { resolve } from "path";
import { ROOT_DIR } from "./env.mjs";

export const MIGRATIONS_DIR = resolve(ROOT_DIR, "supabase", "migrations");

export function listMigrations() {
  return readdirSync(MIGRATIONS_DIR)
    .filter((file) => /^\d{3}_.+\.sql$/.test(file))
    .sort();
}

const USAGE = `Choose which migrations to run:
  <number> [<number> ...]   specific migrations, e.g. 028 029
  --from <number>           that migration and every later one, e.g. --from 019`;

/**
 * Resolves CLI args to migration file names. Migrations are not guaranteed to be
 * idempotent, so there is deliberately no "run everything" default.
 */
export function selectMigrations(args) {
  const all = listMigrations();
  const pad = (value) => String(value).padStart(3, "0");

  if (args[0] === "--from" && args[1]) {
    const from = pad(args[1]);
    return all.filter((file) => file.slice(0, 3) >= from);
  }

  if (args.length > 0 && args.every((arg) => /^\d{1,3}$/.test(arg))) {
    const wanted = new Set(args.map(pad));
    const selected = all.filter((file) => wanted.has(file.slice(0, 3)));
    const found = new Set(selected.map((file) => file.slice(0, 3)));
    const unknown = [...wanted].filter((n) => !found.has(n));
    if (unknown.length > 0) throw new Error(`No migration file for: ${unknown.join(", ")}`);
    return selected;
  }

  throw new Error(`${USAGE}\n\nAvailable: ${all[0]} … ${all.at(-1)}`);
}
