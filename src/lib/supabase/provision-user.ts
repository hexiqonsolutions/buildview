import "server-only";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { logServerError, toPublicMessage } from "@/lib/errors/server";
import type { UserInsert, UserRole } from "@/lib/types";

const SYNC_FAILED_MESSAGE = "Could not sync users from Supabase Auth.";

type AuthUserLike = {
  id: string;
  email?: string | null;
  user_metadata?: {
    full_name?: string;
    name?: string;
    avatar_url?: string;
    picture?: string;
    role?: string;
  } | null;
};

function profileFromAuth(authUser: AuthUserLike): UserInsert | null {
  const email = authUser.email?.trim() || `${authUser.id}@buildview.local`;
  const metadata = authUser.user_metadata;
  const fullName =
    metadata?.full_name?.trim() ||
    metadata?.name?.trim() ||
    email.split("@")[0] ||
    "User";
  const avatarUrl =
    metadata?.avatar_url?.trim() || metadata?.picture?.trim() || null;
  const role =
    metadata?.role === "super_admin" ? "super_admin" : "client";

  return {
    id: authUser.id,
    email,
    full_name: fullName,
    role: role as UserRole,
    client_id: null,
    avatar_url: avatarUrl,
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
        logServerError("ensureUserProfile.restore", error, { userId: authUser.id });
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
    logServerError("ensureUserProfile.insert", error, { userId: authUser.id });
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
      return {
        inserted: 0,
        restored: 0,
        authCount: 0,
        profileCount: 0,
        error: toPublicMessage("syncUserProfilesFromAuth.listUsers", listError, SYNC_FAILED_MESSAGE),
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
        error: toPublicMessage(
          "syncUserProfilesFromAuth.listUsers",
          "Supabase Auth returned 0 users; check that the service role key belongs to this project",
          SYNC_FAILED_MESSAGE
        ),
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

    if (byIdError || byEmailError) {
      return {
        inserted: 0,
        restored: 0,
        authCount,
        profileCount: profileCount ?? 0,
        error: toPublicMessage(
          "syncUserProfilesFromAuth.fetchProfiles",
          byIdError ?? byEmailError,
          SYNC_FAILED_MESSAGE
        ),
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
            return {
              inserted: 0,
              restored,
              authCount,
              profileCount: profileCount ?? 0,
              error: toPublicMessage("syncUserProfilesFromAuth.restore", error, SYNC_FAILED_MESSAGE),
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
            return {
              inserted: 0,
              restored,
              authCount,
              profileCount: profileCount ?? 0,
              error: toPublicMessage(
                "syncUserProfilesFromAuth.staleEmailCleanup",
                delError,
                SYNC_FAILED_MESSAGE
              ),
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
      return {
        inserted: 0,
        restored,
        authCount,
        profileCount: profileCount ?? 0,
        error: toPublicMessage("syncUserProfilesFromAuth.insert", insertError, SYNC_FAILED_MESSAGE),
      };
    }

    return {
      inserted: toInsert.length,
      restored,
      authCount,
      profileCount: (profileCount ?? 0) + toInsert.length + restored,
    };
  } catch (err) {
    return {
      inserted: 0,
      restored: 0,
      authCount: 0,
      profileCount: 0,
      error: toPublicMessage("syncUserProfilesFromAuth", err, SYNC_FAILED_MESSAGE),
    };
  }
}
