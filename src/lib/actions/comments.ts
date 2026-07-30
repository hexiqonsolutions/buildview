"use server";

import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import {
  createCommentSchema,
  updateCommentStatusSchema,
} from "@/lib/validations/comment";
import type { ProjectCommentInsert, ProjectCommentWithUser, UserRole } from "@/lib/types";
import { canCommentOnProject, isBuildViewStaffRole } from "@/lib/auth/roles";

export type CommentActionResult =
  | { ok: true }
  | { ok: false; error: string };

function fail(message: string): CommentActionResult {
  return { ok: false, error: message };
}

async function getActorProfile(userId: string) {
  try {
    const admin = createServiceRoleClient();
    const { data, error } = await admin
      .from("users")
      .select("id, role, is_active, client_id")
      .eq("id", userId)
      .is("deleted_at", null)
      .maybeSingle();

    if (error || !data?.is_active) return null;
    return data;
  } catch (err) {
    console.error("[comments] getActorProfile failed:", err);
    return null;
  }
}

async function canAccessProjectForComment(
  projectId: string,
  role: UserRole,
  clientId: string | null,
  userId: string
): Promise<boolean> {
  if (isBuildViewStaffRole(role)) return true;

  try {
    const admin = createServiceRoleClient();
    const { data: project } = await admin
      .from("projects")
      .select("id, client_id, deleted_at")
      .eq("id", projectId)
      .maybeSingle();

    if (!project || project.deleted_at) return false;

    if (role === "client_admin" && clientId) {
      return project.client_id === clientId;
    }

    if (role === "site_supervisor" || role === "site_engineer") {
      if (clientId && project.client_id === clientId) return true;
      const { data: assignment } = await admin
        .from("project_assignments")
        .select("id")
        .eq("project_id", projectId)
        .eq("user_id", userId)
        .is("deleted_at", null)
        .maybeSingle();
      return Boolean(assignment);
    }

    if (role === "client" || role === "client_user") {
      return Boolean(clientId && project.client_id === clientId);
    }

    return false;
  } catch (err) {
    console.error("[comments] canAccessProjectForComment failed:", err);
    return false;
  }
}

export async function getProjectComments(
  projectId: string
): Promise<ProjectCommentWithUser[]> {
  try {
    const admin = createServiceRoleClient();
    const { data, error } = await admin
      .from("project_comments")
      .select(
        "*, author:users!project_comments_created_by_fkey(id, full_name, email, avatar_url, role)"
      )
      .eq("project_id", projectId)
      .is("deleted_at", null)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("[getProjectComments] failed:", error.message);
      return [];
    }

    return (data ?? []) as unknown as ProjectCommentWithUser[];
  } catch (err) {
    console.error("[getProjectComments] unexpected failure:", err);
    return [];
  }
}

export async function addProjectComment(data: {
  project_id: string;
  message: string;
  context_type?: "project" | "report" | "document";
  context_label?: string;
  parent_id?: string | null;
}): Promise<CommentActionResult> {
  const validation = createCommentSchema.safeParse(data);
  if (!validation.success) {
    return fail(validation.error.errors[0]?.message ?? "Invalid comment");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return fail("You must be signed in to comment.");

  const profile = await getActorProfile(user.id);
  if (!profile || !canCommentOnProject(profile.role as UserRole)) {
    return fail("You do not have permission to comment");
  }

  const allowed = await canAccessProjectForComment(
    validation.data.project_id,
    profile.role as UserRole,
    profile.client_id,
    user.id
  );
  if (!allowed) {
    return fail("You do not have access to comment on this project");
  }

  let parentId: string | null = validation.data.parent_id ?? null;
  let message = validation.data.message;

  try {
    const admin = createServiceRoleClient();

    if (parentId) {
      const { data: parent, error: parentError } = await admin
        .from("project_comments")
        .select("id, project_id, parent_id, deleted_at")
        .eq("id", parentId)
        .maybeSingle();

      if (parentError || !parent || parent.deleted_at) {
        return fail("The comment you are replying to was not found.");
      }
      if (parent.project_id !== validation.data.project_id) {
        return fail("Replies must stay on the same project.");
      }
      // Flatten to one reply level under the root thread
      parentId = parent.parent_id ?? parent.id;
    }

    if (
      !parentId &&
      validation.data.context_type &&
      validation.data.context_type !== "project" &&
      validation.data.context_label
    ) {
      const kind = validation.data.context_type === "report" ? "Report" : "Document";
      message = `[${kind}: ${validation.data.context_label}] ${message}`;
    }

    const payload: ProjectCommentInsert = {
      project_id: validation.data.project_id,
      message,
      status: "open",
      parent_id: parentId,
      created_by: user.id,
      updated_by: user.id,
    };

    const { error } = await admin.from("project_comments").insert(payload);
    if (error) {
      console.error("[addProjectComment] insert failed:", error.message, error.code);
      if (error.code === "42P01") {
        return fail(
          "Comments are not enabled in the database yet. Run supabase/FIX_project_comments.sql in Supabase."
        );
      }
      if (
        error.message?.toLowerCase().includes("parent_id") ||
        error.code === "42703"
      ) {
        return fail(
          "Comment replies are not enabled yet. Run supabase/FIX_comment_replies.sql in Supabase."
        );
      }
      return fail(error.message || "Failed to post comment");
    }
  } catch (err) {
    console.error("[addProjectComment] unexpected failure:", err);
    return fail("Failed to post comment. Please try again.");
  }

  return { ok: true };
}

export async function updateCommentStatus(
  id: string,
  status: "open" | "resolved"
): Promise<CommentActionResult> {
  const validation = updateCommentStatusSchema.safeParse({ id, status });
  if (!validation.success) {
    return fail(validation.error.errors[0]?.message ?? "Invalid request");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail("You must be signed in.");

  try {
    const admin = createServiceRoleClient();
    const { data: comment, error: fetchError } = await admin
      .from("project_comments")
      .select("id, project_id, created_by")
      .eq("id", validation.data.id)
      .is("deleted_at", null)
      .maybeSingle();

    if (fetchError || !comment) return fail("Comment not found.");

    const profile = await getActorProfile(user.id);
    if (!profile) return fail("You do not have permission to update this comment");

    const isStaff = isBuildViewStaffRole(profile.role as UserRole);
    if (!isStaff && comment.created_by !== user.id) {
      return fail("You can only update your own comments");
    }

    const { error } = await admin
      .from("project_comments")
      .update({ status: validation.data.status, updated_by: user.id })
      .eq("id", validation.data.id);

    if (error) return fail(error.message || "Failed to update comment");
  } catch (err) {
    console.error("[updateCommentStatus] unexpected failure:", err);
    return fail("Failed to update comment");
  }

  return { ok: true };
}

export async function deleteProjectComment(id: string): Promise<CommentActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail("You must be signed in.");

  try {
    const admin = createServiceRoleClient();
    const { data: comment, error: fetchError } = await admin
      .from("project_comments")
      .select("id, created_by, parent_id")
      .eq("id", id)
      .is("deleted_at", null)
      .maybeSingle();

    if (fetchError || !comment) return fail("Comment not found.");

    const profile = await getActorProfile(user.id);
    if (!profile) return fail("You do not have permission to delete this comment");

    const isStaff = isBuildViewStaffRole(profile.role as UserRole);
    if (!isStaff && comment.created_by !== user.id) {
      return fail("You can only delete your own comments");
    }

    const now = new Date().toISOString();
    const softDelete = {
      deleted_at: now,
      deleted_by: user.id,
      updated_by: user.id,
    };

    const { error } = await admin
      .from("project_comments")
      .update(softDelete)
      .eq("id", id)
      .is("deleted_at", null);

    if (error) return fail(error.message || "Failed to delete comment");

    // Soft-delete nested replies when removing a root thread
    if (!comment.parent_id) {
      await admin
        .from("project_comments")
        .update(softDelete)
        .eq("parent_id", id)
        .is("deleted_at", null);
    }
  } catch (err) {
    console.error("[deleteProjectComment] unexpected failure:", err);
    return fail("Failed to delete comment");
  }

  return { ok: true };
}
