import "server-only";

import { createClient } from "@/lib/supabase/server";
import { validate } from "@/lib/validations/parse";
import { projectIdSchema } from "@/lib/validations/data";

export async function getProjectFolders(projectId: string) {
  if (!validate(projectIdSchema, projectId).success) return [];

  const supabase = await createClient();
  const { data } = await supabase
    .from("document_folders")
    .select("*")
    .eq("project_id", projectId)
    .is("deleted_at", null)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });
  return data || [];
}

export async function getAllFolders() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("document_folders")
    .select("*, project:projects(name)")
    .is("deleted_at", null)
    .order("name", { ascending: true });
  return data || [];
}

export async function getProjectDocuments(projectId: string) {
  if (!validate(projectIdSchema, projectId).success) return { folders: [], documents: [] };

  const supabase = await createClient();
  const { data: folders } = await supabase
    .from("document_folders")
    .select("*")
    .eq("project_id", projectId)
    .is("deleted_at", null)
    .order("sort_order", { ascending: true });

  const { data: documents } = await supabase
    .from("documents")
    .select("*")
    .eq("project_id", projectId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  const currentDocuments = (documents || []).filter((doc) => doc.is_current !== false);

  return { folders: folders || [], documents: currentDocuments };
}

export async function getAllDocuments() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("documents")
    .select("*, project:projects(name)")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
  return data || [];
}
