import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types";
import { getServiceRoleKey, getSupabaseUrl } from "@/lib/supabase/env";

export type SupabaseServiceRoleClient = ReturnType<
  typeof createSupabaseClient<Database>
>;

/** Service-role client — bypasses RLS. Server/middleware only; never expose to the browser. */
export function createServiceRoleClient(): SupabaseServiceRoleClient {
  return createSupabaseClient<Database>(getSupabaseUrl(), getServiceRoleKey(), {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
