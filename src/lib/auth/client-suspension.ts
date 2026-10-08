import "server-only";

import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { isBuildViewStaffRole } from "@/lib/auth/roles";
import { PublicError } from "@/lib/errors/public";
import type { UserRole } from "@/lib/types";

export const CLIENT_SUSPENDED_MESSAGE =
  "Your account has been suspended due to a pending payment. Please clear the outstanding dues to restore access.";

const isClientInactive = cache(async (clientId: string): Promise<boolean> => {
  let reader;
  try {
    reader = createServiceRoleClient();
  } catch {
    reader = await createClient();
  }

  const { data } = await reader
    .from("clients")
    .select("is_active")
    .eq("id", clientId)
    .maybeSingle();

  return data?.is_active === false;
});

/**
 * True when the user belongs to a client company that staff have suspended
 * (`clients.is_active = false`). Staff are never affected.
 */
export async function isClientAccountSuspended(user: {
  role: UserRole | string | null | undefined;
  client_id: string | null | undefined;
}): Promise<boolean> {
  if (!user.client_id || !user.role || isBuildViewStaffRole(user.role as UserRole)) {
    return false;
  }
  return isClientInactive(user.client_id);
}

export async function assertClientNotSuspended(user: {
  role: UserRole | string | null | undefined;
  client_id: string | null | undefined;
}): Promise<void> {
  if (await isClientAccountSuspended(user)) {
    throw new PublicError(CLIENT_SUSPENDED_MESSAGE);
  }
}
