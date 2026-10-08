import "server-only";

import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { isBuildViewStaffRole, isClientPortalRole } from "@/lib/auth/roles";
import type { Project, UserRole } from "@/lib/types";
import { isProjectVisibleInClientPortal } from "@/lib/portal/project-visibility";
import { validate } from "@/lib/validations/parse";
import { projectIdSchema } from "@/lib/validations/data";

export async function getProjectTours(projectId: string) {
  if (!validate(projectIdSchema, projectId).success) return [];

  const supabase = await createClient();
  const { data } = await supabase
    .from("project_tours")
    .select("*")
    .eq("project_id", projectId)
    .is("deleted_at", null)
    .order("sort_order", { ascending: true })
    .order("capture_date", { ascending: false });
  return data || [];
}

export async function getAccessibleTours() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: profile } = await supabase
    .from("users")
    .select("role, client_id")
    .eq("id", user.id)
    .single();

  const role = profile?.role as UserRole | undefined;

  const query = supabase
    .from("project_tours")
    .select("*, project:projects(id, name, client_name, status)")
    .is("deleted_at", null)
    .order("capture_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (role && isBuildViewStaffRole(role)) {
    const { data } = await query;
    return data || [];
  }

  const projectIds = new Set<string>();

  if (role && isClientPortalRole(role) && profile?.client_id) {
    let loadedOrg = false;
    try {
      const admin = createServiceRoleClient();
      const { data: adminProjects } = await admin
        .from("projects")
        .select("id")
        .eq("client_id", profile.client_id)
        .is("deleted_at", null);
      for (const p of adminProjects || []) {
        projectIds.add(p.id);
      }
      loadedOrg = true;
    } catch {
      loadedOrg = false;
    }

    if (!loadedOrg) {
      const { data: orgProjects } = await supabase
        .from("projects")
        .select("id")
        .eq("client_id", profile.client_id)
        .is("deleted_at", null);
      for (const p of orgProjects || []) {
        projectIds.add(p.id);
      }
    }
  }

  const { data: assignments } = await supabase
    .from("project_assignments")
    .select("project_id")
    .eq("user_id", user.id)
    .is("deleted_at", null);

  for (const a of assignments || []) {
    if (a.project_id) projectIds.add(a.project_id);
  }

  if (projectIds.size === 0) return [];

  const { data } = await query.in("project_id", Array.from(projectIds));
  const tours = data || [];

  if (role && isClientPortalRole(role)) {
    return tours.filter((tour) => {
      const project = tour.project as Project | null;
      return project ? isProjectVisibleInClientPortal(project) : false;
    });
  }

  return tours;
}

export async function getAllTours() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("project_tours")
    .select("*, project:projects(id, name)")
    .order("created_at", { ascending: false });
  return data || [];
}
