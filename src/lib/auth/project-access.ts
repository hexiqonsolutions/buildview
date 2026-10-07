import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { isBuildViewStaffRole } from "@/lib/auth/roles";
import type { UserRole } from "@/lib/types";

export type ProjectActor = {
  userId: string;
  role: UserRole;
  clientId: string | null;
};

/** The signed-in, active user's role and org, or null. */
export async function getActiveActor(): Promise<ProjectActor | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("users")
    .select("role, client_id, is_active")
    .eq("id", user.id)
    .is("deleted_at", null)
    .maybeSingle();

  if (!profile?.is_active || !profile.role) return null;
  return { userId: user.id, role: profile.role as UserRole, clientId: profile.client_id };
}

/**
 * App-layer read access to a project: staff see everything; client roles see
 * their organization's projects and any project they're assigned to.
 * Must be checked before reading project data with the service role.
 */
export async function canViewProject(actor: ProjectActor, projectId: string): Promise<boolean> {
  if (isBuildViewStaffRole(actor.role)) return true;

  let reader;
  try {
    reader = createServiceRoleClient();
  } catch {
    // Without the service role, RLS (assignment-based) is the only check available.
    reader = await createClient();
  }

  const { data: project } = await reader
    .from("projects")
    .select("client_id, deleted_at")
    .eq("id", projectId)
    .maybeSingle();

  if (!project || project.deleted_at) return false;
  if (actor.clientId && project.client_id === actor.clientId) return true;

  const { data: assignment } = await reader
    .from("project_assignments")
    .select("id")
    .eq("project_id", projectId)
    .eq("user_id", actor.userId)
    .is("deleted_at", null)
    .maybeSingle();

  return Boolean(assignment);
}

export async function currentUserCanViewProject(projectId: string): Promise<boolean> {
  const actor = await getActiveActor();
  return actor ? canViewProject(actor, projectId) : false;
}
