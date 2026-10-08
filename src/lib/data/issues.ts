import "server-only";

import { createClient } from "@/lib/supabase/server";
import { validate } from "@/lib/validations/parse";
import { projectIdSchema } from "@/lib/validations/data";

export async function getProjectIssues(projectId: string) {
  if (!validate(projectIdSchema, projectId).success) return [];

  const supabase = await createClient();
  const { data } = await supabase
    .from("issues")
    .select(
      "*, issue_images(*), assigned_user:users!issues_assigned_to_fkey(id, full_name, email, avatar_url)"
    )
    .eq("project_id", projectId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  return (data || []).map((issue) => ({
    ...issue,
    issue_images:
      issue.issue_images?.filter(
        (image: { deleted_at: string | null }) => !image.deleted_at
      ) ?? [],
  }));
}

export async function getAllIssues() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("issues")
    .select(
      "*, project:projects(name), issue_images(*), assigned_user:users!issues_assigned_to_fkey(id, full_name, email, avatar_url)"
    )
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  return (data || []).map((issue) => ({
    ...issue,
    issue_images:
      issue.issue_images?.filter(
        (image: { deleted_at: string | null }) => !image.deleted_at
      ) ?? [],
  }));
}
