import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { can, type PermissionResource } from "@/lib/auth/permissions";
import {
  canManageClientUploads,
  canUploadMatterport,
  isBuildViewStaffRole,
  isClientPortalRole,
} from "@/lib/auth/roles";
import type { UserRole } from "@/lib/types";

export type UploadAuthContext = {
  userId: string;
  role: UserRole;
  clientId: string | null;
};

/**
 * Ensure the signed-in user may upload to this project for the given resource.
 * Staff: any project. Client Admin: org projects. Site Supervisor: assigned projects.
 */
export async function assertCanUploadToProject(
  projectId: string,
  resource: PermissionResource = "upload"
): Promise<UploadAuthContext> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("You must be signed in");

  const { data: profile } = await supabase
    .from("users")
    .select("role, client_id, is_active")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.is_active) throw new Error("Account is inactive");
  const role = profile.role as UserRole;

  if (resource === "matterport") {
    if (!canUploadMatterport(role)) {
      throw new Error("Only BuildView Super Admin and Admin can upload virtual tours");
    }
    if (!isBuildViewStaffRole(role)) {
      throw new Error("You do not have permission to upload virtual tours");
    }
    return { userId: user.id, role, clientId: profile.client_id };
  }

  if (!can(role, "upload", resource) && !canManageClientUploads(role)) {
    throw new Error("You do not have permission to upload");
  }

  if (isBuildViewStaffRole(role)) {
    return { userId: user.id, role, clientId: profile.client_id };
  }

  if (!isClientPortalRole(role)) {
    throw new Error("You do not have permission to upload");
  }

  // Verify project access for client roles.
  let projectClientId: string | null = null;
  try {
    const admin = createServiceRoleClient();
    const { data: project } = await admin
      .from("projects")
      .select("id, client_id, deleted_at")
      .eq("id", projectId)
      .maybeSingle();
    if (!project || project.deleted_at) throw new Error("Project not found");
    projectClientId = project.client_id;
  } catch (err) {
    if (err instanceof Error && err.message === "Project not found") throw err;
    const { data: project } = await supabase
      .from("projects")
      .select("id, client_id, deleted_at")
      .eq("id", projectId)
      .maybeSingle();
    if (!project || project.deleted_at) throw new Error("Project not found");
    projectClientId = project.client_id;
  }

  if (role === "client_admin") {
    if (!profile.client_id || profile.client_id !== projectClientId) {
      throw new Error("You can only upload to your organization's projects");
    }
    return { userId: user.id, role, clientId: profile.client_id };
  }

  if (role === "site_supervisor" || role === "site_engineer") {
    const { data: assignment } = await supabase
      .from("project_assignments")
      .select("id")
      .eq("user_id", user.id)
      .eq("project_id", projectId)
      .is("deleted_at", null)
      .maybeSingle();

    if (!assignment) {
      if (profile.client_id && profile.client_id === projectClientId) {
        return { userId: user.id, role, clientId: profile.client_id };
      }
      throw new Error("You can only upload to projects assigned to you");
    }
    return { userId: user.id, role, clientId: profile.client_id };
  }

  throw new Error("You do not have permission to upload");
}
