import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/lib/types";
import { getSupabasePublicConfig } from "@/lib/supabase/env";

export type SupabaseBrowserClient = ReturnType<
  typeof createBrowserClient<Database>
>;

let browserClient: SupabaseBrowserClient | undefined;

/**
 * Browser-side Supabase client for Client Components.
 * Uses a module singleton to avoid creating multiple clients per tab.
 */
export function createClient(): SupabaseBrowserClient {
  if (!browserClient) {
    const { url, anonKey } = getSupabasePublicConfig();
    browserClient = createBrowserClient<Database>(url, anonKey, {
      auth: {
        flowType: "pkce",
        detectSessionInUrl: true,
        persistSession: true,
      },
    });
  }
  return browserClient;
}
