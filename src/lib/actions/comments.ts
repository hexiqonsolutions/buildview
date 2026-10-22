"use server";

import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import {
  commentIdSchema,
  commentProjectIdSchema,
  createCommentSchema,
  updateCommentStatusSchema,
} from "@/lib/validations/comment";
import { validate } from "@/lib/validations/parse";
import type { ProjectCommentInsert, ProjectCommentWithUser, UserRole } from "@/lib/types";
import { canCommentOnProject, isBuildViewStaffRole } from "@/lib/auth/roles";
import { currentUserCanViewProject } from "@/lib/auth/project-access";
import { isClientAccountSuspended } from "@/lib/auth/client-suspension";
import { logServerError, toPublicMessage } from "@/lib/errors/server";

type CommentActionResult =
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
    if (await isClientAccountSuspended(data)) return null;
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
  if (!validate(commentProjectIdSchema, projectId).success) return [];
  if (!(await currentUserCanViewProject(projectId))) return [];

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
      logServerError("getProjectComments", error, { projectId });
      return [];
    }

    const comments = (data ?? []) as unknown as ProjectCommentWithUser[];
    if (comments.length === 0) return comments;

    // Enrich with like counts + whether the signed-in user liked each comment.
    // Graceful before migration 038 is applied (likes just read as zero).
    try {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { data: likes, error: likesError } = await admin
        .from("project_comment_likes")
        .select("comment_id, user_id")
        .in(
          "comment_id",
          comments.map((c) => c.id)
        );

      if (!likesError && likes) {
        const counts = new Map<string, number>();
        const mine = new Set<string>();
        for (const like of likes) {
          counts.set(like.comment_id, (counts.get(like.comment_id) ?? 0) + 1);
          if (user && like.user_id === user.id) mine.add(like.comment_id);
        }
        for (const comment of comments) {
          comment.like_count = counts.get(comment.id) ?? 0;
          comment.liked_by_me = mine.has(comment.id);
        }
      }
    } catch {
      // Likes are decorative — never fail the comment list over them.
    }

    return comments;
  } catch (err) {
    logServerError("getProjectComments", err, { projectId });
    return [];
  }
}

type ToggleLikeResult =
  | { ok: true; liked: boolean; likeCount: number }
  | { ok: false; error: string };

export async function toggleProjectCommentLike(
  commentId: string
): Promise<ToggleLikeResult> {
  const validation = validate(commentIdSchema, commentId);
  if (!validation.success) return { ok: false, error: validation.error };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "You must be signed in." };

  try {
    const admin = createServiceRoleClient();
    const { data: comment, error: fetchError } = await admin
      .from("project_comments")
      .select("id, project_id")
      .eq("id", validation.data)
      .is("deleted_at", null)
      .maybeSingle();

    if (fetchError || !comment) return { ok: false, error: "Comment not found." };

    const profile = await getActorProfile(user.id);
    if (!profile || !canCommentOnProject(profile.role as UserRole)) {
      return { ok: false, error: "You do not have permission to like comments" };
    }

    const allowed = await canAccessProjectForComment(
      comment.project_id,
      profile.role as UserRole,
      profile.client_id,
      user.id
    );
    if (!allowed) {
      return { ok: false, error: "You do not have access to this project" };
    }

    const { data: existing, error: existingError } = await admin
      .from("project_comment_likes")
      .select("id")
      .eq("comment_id", validation.data)
      .eq("user_id", user.id)
      .maybeSingle();

    if (existingError) {
      if (existingError.code === "42P01") {
        return {
          ok: false,
          error: "Likes are not available yet. Contact BuildView support.",
        };
      }
      return { ok: false, error: "Failed to update like. Please try again." };
    }

    if (existing) {
      const { error: deleteError } = await admin
        .from("project_comment_likes")
        .delete()
        .eq("id", existing.id);
      if (deleteError) return { ok: false, error: "Failed to update like. Please try again." };
    } else {
      const { error: insertError } = await admin
        .from("project_comment_likes")
        .insert({ comment_id: validation.data, user_id: user.id });
      // 23505 = a parallel tap already inserted it — treat as liked.
      if (insertError && insertError.code !== "23505") {
        return { ok: false, error: "Failed to update like. Please try again." };
      }
    }

    const { count } = await admin
      .from("project_comment_likes")
      .select("id", { count: "exact", head: true })
      .eq("comment_id", validation.data);

    return { ok: true, liked: !existing, likeCount: count ?? 0 };
  } catch (err) {
    return {
      ok: false,
      error: toPublicMessage("toggleProjectCommentLike", err, "Failed to update like."),
    };
  }
}

export async function addProjectComment(data: {
  project_id: string;
  message: string;
  context_type?: "project" | "report" | "document";
  context_label?: string;
  parent_id?: string | null;
}): Promise<CommentActionResult> {
  const validation = validate(createCommentSchema, data);
  if (!validation.success) return fail(validation.error);

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
      if (error.code === "42P01") {
        logServerError("addProjectComment", error, { hint: "Apply supabase/FIX_project_comments.sql" });
        return fail("Comments are not available yet. Contact BuildView support.");
      }
      if (
        error.message?.toLowerCase().includes("parent_id") ||
        error.code === "42703"
      ) {
        logServerError("addProjectComment", error, { hint: "Apply supabase/FIX_comment_replies.sql" });
        return fail("Comment replies are not available yet. Contact BuildView support.");
      }
      return fail(toPublicMessage("addProjectComment", error, "Failed to post comment. Please try again."));
    }
  } catch (err) {
    return fail(toPublicMessage("addProjectComment", err, "Failed to post comment. Please try again."));
  }

  return { ok: true };
}

export async function updateCommentStatus(
  id: string,
  status: "open" | "resolved"
): Promise<CommentActionResult> {
  const validation = validate(updateCommentStatusSchema, { id, status });
  if (!validation.success) return fail(validation.error);

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

    if (error) return fail(toPublicMessage("updateCommentStatus", error, "Failed to update comment"));
  } catch (err) {
    return fail(toPublicMessage("updateCommentStatus", err, "Failed to update comment"));
  }

  return { ok: true };
}

export async function deleteProjectComment(id: string): Promise<CommentActionResult> {
  const validation = validate(commentIdSchema, id);
  if (!validation.success) return fail(validation.error);

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

    if (error) return fail(toPublicMessage("deleteProjectComment", error, "Failed to delete comment"));

    // Soft-delete nested replies when removing a root thread
    if (!comment.parent_id) {
      await admin
        .from("project_comments")
        .update(softDelete)
        .eq("parent_id", id)
        .is("deleted_at", null);
    }
  } catch (err) {
    return fail(toPublicMessage("deleteProjectComment", err, "Failed to delete comment"));
  }

  return { ok: true };
}
