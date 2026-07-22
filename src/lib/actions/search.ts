"use server";

import { createClient } from "@/lib/supabase/server";
import { canAccessAdmin } from "@/lib/auth/permissions";

export type GlobalSearchResult = {
  clients: Array<{ id: string; name: string; company_name: string | null; href: string }>;
  projects: Array<{ id: string; name: string; client_name: string; href: string }>;
  issues: Array<{ id: string; title: string; project_name: string; href: string }>;
  documents: Array<{ id: string; name: string; project_name: string; href: string }>;
  invoices: Array<{ id: string; label: string; client_name: string; href: string }>;
  users: Array<{ id: string; name: string; email: string; href: string }>;
};

const EMPTY: GlobalSearchResult = {
  clients: [],
  projects: [],
  issues: [],
  documents: [],
  invoices: [],
  users: [],
};

export async function globalSearch(query: string): Promise<GlobalSearchResult> {
  const q = query.trim();
  if (q.length < 2) return EMPTY;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return EMPTY;

  const { data: profile } = await supabase
    .from("users")
    .select("role, client_id")
    .eq("id", user.id)
    .single();

  const isAdmin = profile?.role ? canAccessAdmin(profile.role) : false;
  const pattern = `%${q}%`;

  const [clientsRes, projectsRes, issuesRes, documentsRes, invoicesRes, usersRes] =
    await Promise.all([
      isAdmin
        ? supabase
            .from("clients")
            .select("id, name, company_name")
            .is("deleted_at", null)
            .or(`name.ilike.${pattern},company_name.ilike.${pattern}`)
            .limit(5)
        : Promise.resolve({ data: [] }),
      supabase
        .from("projects")
        .select("id, name, client:clients(name)")
        .is("deleted_at", null)
        .ilike("name", pattern)
        .limit(5),
      supabase
        .from("issues")
        .select("id, title, project:projects(name)")
        .is("deleted_at", null)
        .ilike("title", pattern)
        .limit(5),
      supabase
        .from("documents")
        .select("id, name, is_current, project:projects(name)")
        .is("deleted_at", null)
        .ilike("name", pattern)
        .limit(8),
      isAdmin
        ? supabase
            .from("invoices")
            .select("id, invoice_number, client:clients(name)")
            .is("deleted_at", null)
            .ilike("invoice_number", pattern)
            .limit(5)
        : Promise.resolve({ data: [] }),
      isAdmin
        ? supabase
            .from("users")
            .select("id, full_name, email")
            .is("deleted_at", null)
            .or(`full_name.ilike.${pattern},email.ilike.${pattern}`)
            .limit(5)
        : Promise.resolve({ data: [] }),
    ]);

  return {
    clients:
      clientsRes.data?.map((c) => ({
        id: c.id,
        name: c.name,
        company_name: c.company_name,
        href: `/admin/clients/${c.id}`,
      })) ?? [],
    projects:
      projectsRes.data?.map((p) => ({
        id: p.id,
        name: p.name,
        client_name: (p.client as { name: string } | null)?.name ?? "Project",
        href: isAdmin ? `/admin/projects/${p.id}` : `/dashboard/projects/${p.id}`,
      })) ?? [],
    issues:
      issuesRes.data?.map((i) => ({
        id: i.id,
        title: i.title,
        project_name: (i.project as { name: string } | null)?.name ?? "Project",
        href: isAdmin ? "/admin/issues" : "/dashboard/issues",
      })) ?? [],
    documents:
      documentsRes.data
        ?.filter((d) => d.is_current !== false)
        .slice(0, 5)
        .map((d) => ({
          id: d.id,
          name: d.name,
          project_name: (d.project as { name: string } | null)?.name ?? "Project",
          href: isAdmin ? "/admin/documents" : "/dashboard/documents",
        })) ?? [],
    invoices:
      invoicesRes.data?.map((inv) => ({
        id: inv.id,
        label: inv.invoice_number,
        client_name: (inv.client as { name: string } | null)?.name ?? "Client",
        href: "/admin/invoices",
      })) ?? [],
    users:
      usersRes.data?.map((u) => ({
        id: u.id,
        name: u.full_name ?? u.email,
        email: u.email,
        href: "/admin/users",
      })) ?? [],
  };
}
