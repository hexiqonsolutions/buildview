import "server-only";

import { createClient } from "@/lib/supabase/server";
import { isClientPortalRole } from "@/lib/auth/roles";
import type { UserRole } from "@/lib/types";
import { validate } from "@/lib/validations/parse";
import { projectIdSchema } from "@/lib/validations/data";
import { requireStaffPermission } from "@/lib/auth/staff";

export async function getProjectInvoices(projectId: string) {
  if (!validate(projectIdSchema, projectId).success) return [];

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  const role = profile?.role as UserRole | undefined;
  // Client portal: only Client Admin (staff always via admin workspace / RLS)
  if (role && isClientPortalRole(role) && role !== "client_admin") {
    return [];
  }

  const { data } = await supabase
    .from("invoices")
    .select("*")
    .eq("project_id", projectId)
    .is("deleted_at", null)
    .order("issued_date", { ascending: false });
  return data ?? [];
}

export async function getInvoices() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: profile } = await supabase
    .from("users")
    .select("role, client_id")
    .eq("id", user.id)
    .single();

  if (profile?.role === "super_admin") {
    const { data } = await supabase
      .from("invoices")
      .select("*")
      .order("created_at", { ascending: false });
    return data || [];
  }

  // Client portal: only Client Admin may load invoices
  if (profile?.role !== "client_admin") {
    return [];
  }

  const { data } = await supabase
    .from("invoices")
    .select("*")
    .eq("client_id", profile?.client_id || "")
    .order("created_at", { ascending: false });
  return data || [];
}

export async function getAdminInvoices() {
  await requireStaffPermission("read", "invoices");
  const supabase = await createClient();
  const { data } = await supabase
    .from("invoices")
    .select(
      "*, client:clients(id, name, company_name), project:projects(id, name)"
    )
    .order("created_at", { ascending: false });
  return data ?? [];
}
