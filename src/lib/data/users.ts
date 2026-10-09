import "server-only";

import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { isBuildViewStaffRole } from "@/lib/auth/roles";
import type { ClientDashboardType, User } from "@/lib/types";
import { validate } from "@/lib/validations/parse";
import { userIdSchema } from "@/lib/validations/data";
import { getActiveActor } from "@/lib/auth/project-access";

export type AdminUserRow = User & {
  last_sign_in_at: string | null;
  client: {
    id: string;
    name: string;
    company_name: string | null;
    dashboard_type?: ClientDashboardType | null;
  } | null;
};

export async function getAllUsers(): Promise<AdminUserRow[]> {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  if (!authUser) return [];

  const { data: me } = await supabase
    .from("users")
    .select("role")
    .eq("id", authUser.id)
    .maybeSingle();

  if (!me || !isBuildViewStaffRole(me.role)) {
    return [];
  }

  let profiles: Array<Record<string, unknown>> | null = null;

  try {
    const admin = createServiceRoleClient();

    const withClient = await admin
      .from("users")
      .select("*, client:clients!users_client_id_fkey(id, name, company_name, dashboard_type)")
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    if (withClient.error) {
      console.warn("[getAllUsers] join select failed:", withClient.error.message);

      const plain = await admin
        .from("users")
        .select("*")
        .is("deleted_at", null)
        .order("created_at", { ascending: false });
      if (plain.error) {
        console.warn("[getAllUsers] plain select failed:", plain.error.message);
      } else {
        profiles = (plain.data as Array<Record<string, unknown>>) ?? [];
      }
    } else {
      profiles = (withClient.data as Array<Record<string, unknown>>) ?? [];
    }

    const authListed = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const lastSignInById = new Map<string, string | null>();
    const emailById = new Map<string, string>();
    for (const u of authListed.data?.users ?? []) {
      lastSignInById.set(u.id, u.last_sign_in_at ?? null);
      if (u.email) emailById.set(u.id, u.email);
    }

    return (profiles ?? []).map((row) => {
      const email = (String(row.email ?? "").trim() || emailById.get(String(row.id)) || "").trim();
      const fullName = String(row.full_name ?? "").trim() || email.split("@")[0] || "User";
      const client = (row.client as AdminUserRow["client"]) ?? null;

      return {
        id: String(row.id),
        email: email || "—",
        full_name: fullName,
        role: row.role as AdminUserRow["role"],
        client_id: (row.client_id as string | null) ?? null,
        avatar_url: (row.avatar_url as string | null) ?? null,
        phone: (row.phone as string | null) ?? null,
        is_active: Boolean(row.is_active),
        created_at: String(row.created_at),
        updated_at: String(row.updated_at),
        deleted_at: (row.deleted_at as string | null) ?? null,
        created_by: (row.created_by as string | null) ?? null,
        updated_by: (row.updated_by as string | null) ?? null,
        deleted_by: (row.deleted_by as string | null) ?? null,
        dashboard_type: (row.dashboard_type as AdminUserRow["dashboard_type"]) ?? null,
        last_sign_in_at: lastSignInById.get(String(row.id)) ?? null,
        client,
      };
    });
  } catch (err) {
    console.warn("[getAllUsers] service role failed, falling back to RLS:", err);
  }

  // Fallback: staff-readable rows via normal client (RLS).
  const { data: fallback, error: fallbackError } = await supabase
    .from("users")
    .select("*, client:clients!users_client_id_fkey(id, name, company_name, dashboard_type)")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (fallbackError) {
    console.warn("[getAllUsers] fallback failed:", fallbackError.message);
    const plain = await supabase
      .from("users")
      .select("*")
      .is("deleted_at", null)
      .order("created_at", { ascending: false });
    return ((plain.data ?? []) as Array<Record<string, unknown>>).map((row) => ({
      id: String(row.id),
      email: String(row.email ?? "—"),
      full_name: String(row.full_name ?? row.email ?? "User"),
      role: row.role as AdminUserRow["role"],
      client_id: (row.client_id as string | null) ?? null,
      avatar_url: (row.avatar_url as string | null) ?? null,
      phone: (row.phone as string | null) ?? null,
      is_active: Boolean(row.is_active),
      created_at: String(row.created_at),
      updated_at: String(row.updated_at),
      deleted_at: (row.deleted_at as string | null) ?? null,
      created_by: (row.created_by as string | null) ?? null,
      updated_by: (row.updated_by as string | null) ?? null,
      deleted_by: (row.deleted_by as string | null) ?? null,
      dashboard_type: (row.dashboard_type as AdminUserRow["dashboard_type"]) ?? null,
      last_sign_in_at: null,
      client: null,
    }));
  }

  return ((fallback ?? []) as Array<Record<string, unknown>>).map((row) => ({
    id: String(row.id),
    email: String(row.email ?? "—"),
    full_name: String(row.full_name ?? row.email ?? "User"),
    role: row.role as AdminUserRow["role"],
    client_id: (row.client_id as string | null) ?? null,
    avatar_url: (row.avatar_url as string | null) ?? null,
    phone: (row.phone as string | null) ?? null,
    is_active: Boolean(row.is_active),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
    deleted_at: (row.deleted_at as string | null) ?? null,
    created_by: (row.created_by as string | null) ?? null,
    updated_by: (row.updated_by as string | null) ?? null,
    deleted_by: (row.deleted_by as string | null) ?? null,
    dashboard_type: (row.dashboard_type as AdminUserRow["dashboard_type"]) ?? null,
    last_sign_in_at: null,
    client: (row.client as AdminUserRow["client"]) ?? null,
  }));
}

export async function getUserAssignments(userId: string) {
  if (!validate(userIdSchema, userId).success) return [];

  const actor = await getActiveActor();
  if (!actor || (!isBuildViewStaffRole(actor.role) && actor.userId !== userId)) return [];

  try {
    const admin = createServiceRoleClient();
    const { data } = await admin
      .from("project_assignments")
      .select("id, project:projects(id, name)")
      .eq("user_id", userId)
      .is("deleted_at", null);
    return data || [];
  } catch {
    const supabase = await createClient();
    const { data } = await supabase
      .from("project_assignments")
      .select("id, project:projects(id, name)")
      .eq("user_id", userId)
      .is("deleted_at", null);
    return data || [];
  }
}
