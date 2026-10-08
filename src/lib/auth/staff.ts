import "server-only";
import { createClient } from "@/lib/supabase/server";
import { can, type PermissionAction, type PermissionResource } from "@/lib/auth/permissions";
import { isBuildViewStaffRole } from "@/lib/auth/roles";
import type { UserRole } from "@/lib/types";
import { PublicError } from "@/lib/errors/public";

const PERMISSION_DENIED = "You do not have permission to perform this action";

/** Throws unless the signed-in user is an active, non-deleted BuildView staff member. */
export async function requireActiveStaff() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new PublicError("You must be signed in");

  const { data: me } = await supabase
    .from("users")
    .select("role, is_active")
    .eq("id", user.id)
    .is("deleted_at", null)
    .maybeSingle();

  const role = me?.role as UserRole | undefined;
  if (!me?.is_active || !role || !isBuildViewStaffRole(role)) {
    throw new PublicError(PERMISSION_DENIED);
  }

  return { supabase, user, role };
}

/**
 * Throws unless the signed-in user is active BuildView staff whose role grants
 * `action` on `resource`. Use before any write that would otherwise rely on RLS
 * alone, since RLS silently filters denied updates instead of erroring.
 */
export async function requireStaffPermission(
  action: PermissionAction,
  resource: PermissionResource
) {
  const actor = await requireActiveStaff();
  if (!can(actor.role, action, resource)) {
    throw new PublicError(PERMISSION_DENIED);
  }
  return actor;
}

/** Non-throwing variant for read paths that return empty data on denial. */
export async function hasStaffPermission(
  action: PermissionAction,
  resource: PermissionResource
): Promise<boolean> {
  try {
    await requireStaffPermission(action, resource);
    return true;
  } catch {
    return false;
  }
}
