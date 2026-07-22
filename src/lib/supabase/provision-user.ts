import { createServiceRoleClient } from "@/lib/supabase/admin";
import type { UserInsert, UserRole } from "@/lib/types";

type AuthUserLike = {
  id: string;
  email?: string | null;
  user_metadata?: {
    full_name?: string;
    role?: string;
  } | null;
};

function profileFromAuth(authUser: AuthUserLike): UserInsert | null {
  const email = authUser.email?.trim() || `${authUser.id}@buildview.local`;
  const fullName =
    authUser.user_metadata?.full_name?.trim() ||
    email.split("@")[0] ||
    "User";
  const role =
    authUser.user_metadata?.role === "super_admin" ? "super_admin" : "client";

  return {
    id: authUser.id,
    email,
    full_name: fullName,
    role: role as UserRole,
    client_id: null,
    avatar_url: null,
    phone: null,
    is_active: true,
    created_by: null,
    updated_by: null,
  };
}

/**
 * Ensures a public.users profile exists for an authenticated Supabase Auth user.
 * Uses the service role so it works even when the signup trigger was never installed.
 */
export async function ensureUserProfile(authUser: AuthUserLike): Promise<boolean> {
  const email = authUser.email?.trim();
  if (!email) return false;

  const admin = createServiceRoleClient();

  const { data: existing } = await admin
    .from("users")
    .select("id, deleted_at")
    .eq("id", authUser.id)
    .maybeSingle();

  if (existing) {
    if (existing.deleted_at) {
      const { error } = await admin
        .from("users")
        .update({ deleted_at: null, deleted_by: null, is_active: true })
        .eq("id", authUser.id);
      if (error) {
        console.error("[ensureUserProfile] restore failed:", error.message);
        return false;
      }
    }
    return true;
  }

  const { data: byEmail } = await admin
    .from("users")
    .select("id, deleted_at")
    .eq("email", email)
    .maybeSingle();

  if (byEmail && byEmail.id !== authUser.id) {
    // Stale profile with same email but different auth id — remove so we can re-link.
    await admin.from("users").delete().eq("id", byEmail.id);
  }

  const payload = profileFromAuth(authUser);
  if (!payload) return false;

  const { error } = await admin.from("users").insert(payload);

  if (error) {
    console.error("[ensureUserProfile] failed:", error.message);
    return false;
  }

  return true;
}

export type SyncUsersResult = {
  inserted: number;
  restored: number;
  authCount: number;
  profileCount: number;
  error?: string;
};

/**
 * Syncs Supabase Auth users into public.users:
 * - inserts missing profiles
 * - restores soft-deleted profiles that still exist in Auth
 */
export async function syncMissingUserProfilesFromAuth(): Promise<number> {
  const result = await syncUserProfilesFromAuthDetailed();
  return result.inserted + result.restored;
}

export async function syncUserProfilesFromAuthDetailed(): Promise<SyncUsersResult> {
  try {
    const admin = createServiceRoleClient();

    const { data: listed, error: listError } = await admin.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });

    if (listError) {
      console.error("[syncUserProfilesFromAuth] list users failed:", listError.message);
      return {
        inserted: 0,
        restored: 0,
        authCount: 0,
        profileCount: 0,
        error: listError.message,
      };
    }

    const authUsers = listed?.users ?? [];
    const authCount = authUsers.length;

    const { count: profileCount } = await admin
      .from("users")
      .select("id", { count: "exact", head: true })
      .is("deleted_at", null);

    if (authUsers.length === 0) {
      return {
        inserted: 0,
        restored: 0,
        authCount: 0,
        profileCount: profileCount ?? 0,
        error:
          "Supabase Auth returned 0 users. Check that SUPABASE_SERVICE_ROLE_KEY matches this project (service_role, not anon).",
      };
    }

    const ids = authUsers.map((u) => u.id);
    const emails = authUsers
      .map((u) => u.email?.trim())
      .filter((e): e is string => Boolean(e));

    const [{ data: byIdRows, error: byIdError }, { data: byEmailRows, error: byEmailError }] =
      await Promise.all([
        admin.from("users").select("id, email, deleted_at").in("id", ids),
        emails.length > 0
          ? admin.from("users").select("id, email, deleted_at").in("email", emails)
          : Promise.resolve({
              data: [] as Array<{ id: string; email: string; deleted_at: string | null }>,
              error: null,
            }),
      ]);

    if (byIdError) {
      console.error("[syncUserProfilesFromAuth] fetch by id failed:", byIdError.message);
      return {
        inserted: 0,
        restored: 0,
        authCount,
        profileCount: profileCount ?? 0,
        error: byIdError.message,
      };
    }
    if (byEmailError) {
      console.error("[syncUserProfilesFromAuth] fetch by email failed:", byEmailError.message);
      return {
        inserted: 0,
        restored: 0,
        authCount,
        profileCount: profileCount ?? 0,
        error: byEmailError.message,
      };
    }

    const byId = new Map((byIdRows ?? []).map((u) => [u.id, u]));
    const byEmail = new Map(
      (byEmailRows ?? []).map((u) => [u.email.trim().toLowerCase(), u])
    );

    let restored = 0;
    const toInsert: UserInsert[] = [];

    for (const authUser of authUsers) {
      const existing = byId.get(authUser.id);
      if (existing) {
        if (existing.deleted_at) {
          const { error } = await admin
            .from("users")
            .update({
              deleted_at: null,
              deleted_by: null,
              is_active: true,
              email: authUser.email?.trim() || existing.email,
            })
            .eq("id", authUser.id);
          if (error) {
            console.error("[syncUserProfilesFromAuth] restore failed:", error.message);
            return {
              inserted: 0,
              restored,
              authCount,
              profileCount: profileCount ?? 0,
              error: error.message,
            };
          }
          restored += 1;
        }
        continue;
      }

      const email = authUser.email?.trim();
      if (email) {
        const emailHit = byEmail.get(email.toLowerCase());
        if (emailHit && emailHit.id !== authUser.id) {
          const { error: delError } = await admin.from("users").delete().eq("id", emailHit.id);
          if (delError) {
            console.error(
              "[syncUserProfilesFromAuth] stale email cleanup failed:",
              delError.message
            );
            return {
              inserted: 0,
              restored,
              authCount,
              profileCount: profileCount ?? 0,
              error: delError.message,
            };
          }
        }
      }

      const payload = profileFromAuth(authUser);
      if (payload) toInsert.push(payload);
    }

    if (toInsert.length === 0) {
      return {
        inserted: 0,
        restored,
        authCount,
        profileCount: profileCount ?? 0,
      };
    }

    const { error: insertError } = await admin.from("users").insert(toInsert);
    if (insertError) {
      console.error("[syncUserProfilesFromAuth] insert failed:", insertError.message);
      return {
        inserted: 0,
        restored,
        authCount,
        profileCount: profileCount ?? 0,
        error: insertError.message,
      };
    }

    return {
      inserted: toInsert.length,
      restored,
      authCount,
      profileCount: (profileCount ?? 0) + toInsert.length + restored,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Sync failed";
    console.error("[syncUserProfilesFromAuth]", message);
    return {
      inserted: 0,
      restored: 0,
      authCount: 0,
      profileCount: 0,
      error: message,
    };
  }
}
