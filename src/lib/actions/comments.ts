"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import {
  createCommentSchema,
  updateCommentStatusSchema,
} from "@/lib/validations/comment";
import type { ProjectCommentInsert, ProjectCommentWithUser, UserRole } from "@/lib/types";
import { canCommentOnProject, isBuildViewStaffRole } from "@/lib/auth/roles";

export async function getProjectComments(
  projectId: string
): Promise<ProjectCommentWithUser[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("project_comments")
    .select(
      "*, author:users!project_comments_created_by_fkey(id, full_name, email, avatar_url, role)"
    )
    .eq("project_id", projectId)
    .is("deleted_at", null)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[getProjectComments] failed:", error.message);
    const admin = createServiceRoleClient();
    const { data: fallback } = await admin
      .from("project_comments")
      .select(
        "*, author:users!project_comments_created_by_fkey(id, full_name, email, avatar_url, role)"
      )
      .eq("project_id", projectId)
      .is("deleted_at", null)
      .order("created_at", { ascending: true });
    return (fallback ?? []) as unknown as ProjectCommentWithUser[];
  }

  return (data ?? []) as unknown as ProjectCommentWithUser[];
}

export async function addProjectComment(data: {
  project_id: string;
  message: string;
  context_type?: "project" | "report" | "document";
  context_label?: string;
}) {
  const validation = createCommentSchema.safeParse(data);
  if (!validation.success) {
    throw new Error(validation.error.errors[0]?.message ?? "Invalid comment");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("You must be signed in to comment.");

  let { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) {
    const admin = createServiceRoleClient();
    const { data: fallbackProfile } = await admin
      .from("users")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    profile = fallbackProfile;
  }

  if (!profile || !canCommentOnProject(profile.role as UserRole)) {
    throw new Error("You do not have permission to comment");
  }

  const validated = validation.data;
  let message = validated.message;
  if (
    validated.context_type &&
    validated.context_type !== "project" &&
    validated.context_label
  ) {
    const kind = validated.context_type === "report" ? "Report" : "Document";
    message = `[${kind}: ${validated.context_label}] ${message}`;
  }

  const payload: ProjectCommentInsert = {
    project_id: validated.project_id,
    message,
    status: "open",
    created_by: user.id,
    updated_by: user.id,
  };

  const { error } = await supabase.from("project_comments").insert(payload);
  if (error) {
    const admin = createServiceRoleClient();
    const { error: retryError } = await admin.from("project_comments").insert(payload);
    if (retryError) throw new Error(retryError.message);
  }

  revalidatePath(`/dashboard/projects/${validated.project_id}`);
  if (isBuildViewStaffRole(profile.role as UserRole)) {
    revalidatePath(`/admin/projects/${validated.project_id}`);
  }
}

export async function updateCommentStatus(id: string, status: "open" | "resolved") {
  const validation = updateCommentStatusSchema.safeParse({ id, status });
  if (!validation.success) {
    throw new Error(validation.error.errors[0]?.message ?? "Invalid request");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: comment, error: fetchError } = await supabase
    .from("project_comments")
    .select("project_id")
    .eq("id", validation.data.id)
    .single();

  if (fetchError || !comment) throw new Error("Comment not found.");

  const { error } = await supabase
    .from("project_comments")
    .update({ status: validation.data.status, updated_by: user?.id ?? null })
    .eq("id", validation.data.id);

  if (error) throw new Error(error.message);

  revalidatePath(`/dashboard/projects/${comment.project_id}`);
}

export async function deleteProjectComment(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: comment, error: fetchError } = await supabase
    .from("project_comments")
    .select("project_id")
    .eq("id", id)
    .single();

  if (fetchError || !comment) throw new Error("Comment not found.");

  const { error } = await supabase
    .from("project_comments")
    .update({
      deleted_at: new Date().toISOString(),
      deleted_by: user?.id ?? null,
      updated_by: user?.id ?? null,
    })
    .eq("id", id)
    .is("deleted_at", null);

  if (error) throw new Error(error.message);

  revalidatePath(`/dashboard/projects/${comment.project_id}`);
}
