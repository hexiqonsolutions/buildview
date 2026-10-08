import "server-only";

import { cache } from "react";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Database } from "@/lib/types";
import type { AuthUserProfile } from "@/lib/types";
import { canAccessAdmin } from "@/lib/auth/permissions";
import { getSupabasePublicConfig } from "@/lib/supabase/env";
import { ensureUserProfile } from "@/lib/supabase/provision-user";

type SupabaseServerClient = ReturnType<
  typeof createServerClient<Database>
>;

/**
 * Server-side Supabase client for Server Components, Route Handlers, and Server Actions.
 * Reads and writes auth cookies via Next.js cookies().
 */
export async function createClient(): Promise<SupabaseServerClient> {
  const cookieStore = await cookies();
  const { url, anonKey } = getSupabasePublicConfig();

  return createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(
        cookiesToSet: { name: string; value: string; options: CookieOptions }[]
      ) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Called from a Server Component that cannot mutate cookies — safe to ignore.
        }
      },
    },
  });
}

/** Returns the authenticated Supabase Auth user, or null if not signed in. */
export async function getAuthUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  return user;
}

/** Returns the BuildView user profile, or null. Deduplicated per request. */
export const getUserProfile = cache(async (): Promise<AuthUserProfile | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  let { data: profile, error } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .is("deleted_at", null)
    .single();

  if ((error || !profile) && user) {
    const created = await ensureUserProfile(user);
    if (created) {
      const retry = await supabase
        .from("users")
        .select("*")
        .eq("id", user.id)
        .is("deleted_at", null)
        .single();
      profile = retry.data;
      error = retry.error;
    }
  }

  if (error || !profile) {
    return null;
  }

  return profile as AuthUserProfile;
});

/** Returns the current user profile or redirects to login. */
async function requireAuth(
  redirectTo = "/login"
): Promise<AuthUserProfile> {
  const profile = await getUserProfile();

  if (!profile || !profile.is_active) {
    redirect(redirectTo);
  }

  return profile;
}

/** Returns the current staff profile or redirects to dashboard. */
export async function requireBuildViewStaff(): Promise<AuthUserProfile> {
  const profile = await requireAuth();

  if (!canAccessAdmin(profile.role)) {
    redirect("/dashboard");
  }

  return profile;
}
