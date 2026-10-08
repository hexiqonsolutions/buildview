import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types";
import { getSupabaseUrl } from "@/lib/supabase/env";

type SupabaseServiceRoleClient = ReturnType<
  typeof createSupabaseClient<Database>
>;

/** Service role key — bypasses RLS. Lives here (not env.ts) because env.ts also ships to the browser. */
function getServiceRoleKey(): string {
  const value = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!value) {
    throw new Error(
      "Missing environment variable: SUPABASE_SERVICE_ROLE_KEY. Copy .env.example to .env.local and fill in your Supabase credentials."
    );
  }
  return value;
}

/** Service-role client — bypasses RLS. Server only; importing this from client code fails the build. */
export function createServiceRoleClient(): SupabaseServiceRoleClient {
  return createSupabaseClient<Database>(getSupabaseUrl(), getServiceRoleKey(), {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
