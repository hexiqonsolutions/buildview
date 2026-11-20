import "server-only";

import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { canAccessAdmin } from "@/lib/auth/permissions";
import { isBuildViewStaffRole } from "@/lib/auth/roles";
import { getDefaultRedirect } from "@/lib/auth/routes";
import type { UserRole } from "@/lib/types";

export type PortalAccessProfile = {
  id: string;
  role: UserRole;
  client_id: string | null;
};

/** Minimal client shape — avoids deep Supabase generic instantiation. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AssignmentLookupClient = { from: (table: string) => any };

/**
 * A portal dashboard is "assigned" when BuildView has linked the user to a
 * client organisation and/or at least one project. Fresh sign-ups start with
 * role=client, client_id=null, and no assignments — they stay on /welcome.
 */
export async function hasAssignedPortalAccessWithClient(
  supabase: AssignmentLookupClient,
  profile: PortalAccessProfile
): Promise<boolean> {
  if (isBuildViewStaffRole(profile.role)) return true;
  if (profile.client_id) return true;

  const { count, error } = await supabase
    .from("project_assignments")
    .select("id", { count: "exact", head: true })
    .eq("user_id", profile.id)
    .is("deleted_at", null);

  if (error) {
    console.error("[hasAssignedPortalAccess]", error.message);
    return false;
  }

  return (count ?? 0) > 0;
}

export const hasAssignedPortalAccess = cache(
  async (profile: PortalAccessProfile): Promise<boolean> => {
    const supabase = await createClient();
    return hasAssignedPortalAccessWithClient(
      supabase as AssignmentLookupClient,
      profile
    );
  }
);

/**
 * Resolve where a signed-in user should land after auth.
 * Honors a safe requested path when the user is allowed to open it.
 */
export async function resolvePostAuthPath(
  supabase: AssignmentLookupClient,
  profile: PortalAccessProfile,
  requestedPath?: string | null
): Promise<string> {
  const hasAccess = await hasAssignedPortalAccessWithClient(supabase, profile);
  const home = getDefaultRedirect(profile.role, { hasPortalAccess: hasAccess });

  if (!requestedPath || !requestedPath.startsWith("/") || requestedPath.startsWith("//")) {
    return home;
  }

  // BuildView staff always land in the admin portal after signing in; client
  // portal links (/dashboard, /welcome) never pull them out of it. Admin deep
  // links and non-portal targets such as /reset-password are kept.
  if (canAccessAdmin(profile.role)) {
    const isClientPortalPath =
      requestedPath === "/dashboard" ||
      requestedPath.startsWith("/dashboard/") ||
      requestedPath.startsWith("/dashboard?") ||
      requestedPath === "/welcome" ||
      requestedPath.startsWith("/welcome/");
    return isClientPortalPath ? "/admin" : requestedPath;
  }

  if (requestedPath === "/welcome" || requestedPath.startsWith("/welcome/")) {
    return hasAccess ? "/dashboard" : "/welcome";
  }

  if (requestedPath === "/dashboard" || requestedPath.startsWith("/dashboard/")) {
    return hasAccess ? requestedPath : "/welcome";
  }

  if (requestedPath === "/admin" || requestedPath.startsWith("/admin/")) {
    return canAccessAdmin(profile.role) ? requestedPath : home;
  }

  return requestedPath;
}
