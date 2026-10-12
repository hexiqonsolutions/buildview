import "server-only";

import { cache } from "react";
import { createServiceRoleClient } from "@/lib/supabase/admin";

const AUTH_PAGE_SIZE = 1000;

export type AuthActivity = {
  lastSignInById: Map<string, string | null>;
  emailById: Map<string, string>;
};

/**
 * Real sign-in times from Supabase Auth, keyed by user id.
 * Callers must enforce staff permissions before using the result.
 */
export const getAuthActivity = cache(async (): Promise<AuthActivity> => {
  const lastSignInById = new Map<string, string | null>();
  const emailById = new Map<string, string>();

  try {
    const admin = createServiceRoleClient();
    for (let page = 1; ; page++) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage: AUTH_PAGE_SIZE });
      if (error) throw error;
      const users = data?.users ?? [];
      for (const u of users) {
        lastSignInById.set(u.id, u.last_sign_in_at ?? null);
        if (u.email) emailById.set(u.id, u.email);
      }
      if (users.length < AUTH_PAGE_SIZE) break;
    }
  } catch (err) {
    console.warn("[getAuthActivity] auth listUsers failed:", err);
  }

  return { lastSignInById, emailById };
});
