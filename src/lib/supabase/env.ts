/**
 * Supabase environment configuration.
 * Validated lazily on first use so `next build` does not fail at import time.
 *
 * NEXT_PUBLIC_* vars must use static process.env access so Next.js can inline
 * them into client bundles. Dynamic process.env[name] is undefined in the browser.
 */

function missingEnvMessage(name: string): string {
  return `Missing environment variable: ${name}. Copy .env.example to .env.local and fill in your Supabase credentials.`;
}

export function getSupabaseUrl(): string {
  const value = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!value) {
    throw new Error(missingEnvMessage("NEXT_PUBLIC_SUPABASE_URL"));
  }
  return value;
}

function getSupabaseAnonKey(): string {
  const value = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!value) {
    throw new Error(missingEnvMessage("NEXT_PUBLIC_SUPABASE_ANON_KEY"));
  }
  return value;
}

/** Convenience bundle for client factories. */
export function getSupabasePublicConfig() {
  return {
    url: getSupabaseUrl(),
    anonKey: getSupabaseAnonKey(),
  };
}
