import "server-only";

import { createClient } from "@/lib/supabase/server";
import { CLIENT_PORTAL_ROLES } from "@/lib/auth/roles";
import { validate } from "@/lib/validations/parse";
import { clientIdSchema } from "@/lib/validations/data";
import { requireStaffPermission } from "@/lib/auth/staff";
import { idsOrNone } from "@/lib/data/query";

export async function getClients() {
  await requireStaffPermission("read", "clients");
  const supabase = await createClient();
  const { data } = await supabase
    .from("clients")
    .select("*")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
  return data || [];
}

export async function getClientDetail(clientId: string) {
  if (!validate(clientIdSchema, clientId).success) return null;
  await requireStaffPermission("read", "clients");

  const supabase = await createClient();

  const { data: client } = await supabase
    .from("clients")
    .select("*")
    .eq("id", clientId)
    .is("deleted_at", null)
    .single();

  if (!client) return null;

  const { data: projects } = await supabase
    .from("projects")
    .select("*")
    .eq("client_id", clientId)
    .is("deleted_at", null);

  const projectIds = projects?.map((p) => p.id) ?? [];
  const ids = idsOrNone(projectIds);

  const [usersRes, toursRes, reportsRes, documentsRes, invoicesRes, issuesRes, timelineRes] =
    await Promise.all([
      supabase.from("users").select("*").eq("client_id", clientId).is("deleted_at", null),
      supabase.from("project_tours").select("*").in("project_id", ids).is("deleted_at", null),
      supabase.from("reports").select("*").in("project_id", ids).is("deleted_at", null),
      supabase.from("documents").select("*").in("project_id", ids).is("deleted_at", null),
      supabase.from("invoices").select("*").eq("client_id", clientId),
      supabase.from("issues").select("*").in("project_id", ids).is("deleted_at", null),
      supabase
        .from("timeline_events")
        .select("*, project:projects(id, name)")
        .in("project_id", ids)
        .is("deleted_at", null)
        .order("event_date", { ascending: false })
        .limit(30),
    ]);

  return {
    client,
    projects: projects ?? [],
    users: usersRes.data ?? [],
    tours: toursRes.data ?? [],
    reports: reportsRes.data ?? [],
    documents: (documentsRes.data ?? []).filter((doc) => doc.is_current !== false),
    invoices: invoicesRes.data ?? [],
    issues: issuesRes.data ?? [],
    timeline: timelineRes.data ?? [],
  };
}

export async function getClientsWithStats() {
  await requireStaffPermission("read", "clients");
  const supabase = await createClient();
  const { data: clients } = await supabase
    .from("clients")
    .select("*")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (!clients?.length) return [];

  const [projectsRes, usersRes, documentsRes, reportsRes] = await Promise.all([
    supabase.from("projects").select("id, client_id").is("deleted_at", null),
    supabase
      .from("users")
      .select("id, client_id, updated_at, role, is_active")
      .is("deleted_at", null)
      .in("role", [...CLIENT_PORTAL_ROLES]),
    supabase.from("documents").select("project_id, file_size").is("deleted_at", null),
    supabase.from("reports").select("project_id, file_size").is("deleted_at", null),
  ]);

  const countByClient: Record<string, number> = {};
  const projectToClient = new Map<string, string>();
  projectsRes.data?.forEach((p) => {
    countByClient[p.client_id] = (countByClient[p.client_id] || 0) + 1;
    projectToClient.set(p.id, p.client_id);
  });

  const usersByClient: Record<string, number> = {};
  const lastActivityByClient: Record<string, string> = {};
  const primaryUserByClient: Record<string, string> = {};
  const primaryAdminByClient: Record<string, string> = {};

  usersRes.data?.forEach((u) => {
    if (!u.client_id) return;
    usersByClient[u.client_id] = (usersByClient[u.client_id] || 0) + 1;
    const prev = lastActivityByClient[u.client_id];
    if (!prev || u.updated_at > prev) {
      lastActivityByClient[u.client_id] = u.updated_at;
    }
    if (u.is_active) {
      if (u.role === "client_admin") {
        primaryAdminByClient[u.client_id] ??= u.id;
      }
      primaryUserByClient[u.client_id] ??= u.id;
    }
  });

  const storageByClient: Record<string, number> = {};
  function addBytes(projectId: string, bytes: number) {
    const clientId = projectToClient.get(projectId);
    if (!clientId) return;
    storageByClient[clientId] = (storageByClient[clientId] || 0) + (bytes ?? 0);
  }
  documentsRes.data?.forEach((d) => addBytes(d.project_id, d.file_size ?? 0));
  reportsRes.data?.forEach((r) => addBytes(r.project_id, r.file_size ?? 0));

  return clients.map((c) => ({
    ...c,
    projectCount: countByClient[c.id] ?? 0,
    userCount: usersByClient[c.id] ?? 0,
    storageBytes: storageByClient[c.id] ?? 0,
    lastLoginAt: lastActivityByClient[c.id] ?? null,
    primaryUserId: primaryAdminByClient[c.id] ?? primaryUserByClient[c.id] ?? null,
  }));
}
