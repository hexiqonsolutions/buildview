"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { createSignedStorageUrl } from "@/lib/supabase/storage-server";
import { resolveIssueImageStoragePath } from "@/lib/supabase/storage";
import {
  getProjectNameForNotify,
  isNotificationRuleEnabled,
  notifyClientsIfEnabled,
  notifySuperAdmins,
} from "@/lib/notifications/server";
import { addIssueImagesSchema, createIssueActionSchema, updateIssueSchema, updateIssueStatusSchema } from "@/lib/validations/issue";
import { parseOrThrow, validate } from "@/lib/validations/parse";
import { uuid } from "@/lib/validations/primitives";
import type {
  IssueImageInsert,
  IssueInsert,
  IssueStatus,
  IssueUpdate,
  UserRole,
} from "@/lib/types";
import { STORAGE_BUCKETS } from "@/lib/types";
import { resolveSpatialForWrite } from "@/lib/admin/spatial-resolve";
import { formatUploadNotifyMessage, portalIssuesLink } from "@/lib/portal/notification-links";
import { isBuildViewStaffRole, canCreateProjectIssue, canUpdateIssueStatus } from "@/lib/auth/roles";
import { recordTimelineEntry } from "@/lib/timeline/auto-entry";
import { PublicError } from "@/lib/errors/public";
import { internalError } from "@/lib/errors/server";
import { UPLOAD_RULES, verifyStoredUploads } from "@/lib/uploads/verify";

function revalidateIssuePaths(projectId: string) {
  revalidatePath("/admin/issues");
  revalidatePath("/dashboard/issues");
  revalidatePath(`/dashboard/projects/${projectId}`);
  revalidatePath("/dashboard");
  revalidatePath("/admin");
}

function isResolvedStatus(status: IssueStatus): boolean {
  return status === "resolved" || status === "closed";
}

/** Logs only the first move into resolved/closed, so resolved → closed is not logged twice. */
async function recordIssueResolution(
  projectId: string,
  title: string,
  previous: IssueStatus,
  next: IssueStatus,
  source: string
) {
  if (isResolvedStatus(previous) || !isResolvedStatus(next)) return;
  await recordTimelineEntry(
    {
      project_id: projectId,
      title: `Issue ${next === "resolved" ? "resolved" : "closed"} — ${title}`,
      progress_note: `Issue marked as ${next}.`,
    },
    source
  );
}

function resolvedAtForStatus(status: IssueStatus): string | null {
  return isResolvedStatus(status) ? new Date().toISOString() : null;
}

/** Keeps the original resolution date when moving between Resolved and Closed. */
function nextResolvedAt(
  previousStatus: IssueStatus,
  previousResolvedAt: string | null,
  nextStatus: IssueStatus
): string | null {
  if (!isResolvedStatus(nextStatus)) return null;
  if (isResolvedStatus(previousStatus) && previousResolvedAt) return previousResolvedAt;
  return new Date().toISOString();
}

async function getSignedInUserWithRole() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new PublicError("You must be signed in");

  const { data: me } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (!me?.role) throw new PublicError("Your account profile could not be found.");
  return { supabase, user, role: me.role as UserRole };
}

/**
 * Mirrors the portal's project visibility (assignment, or org-wide for Client Admin).
 * Must pass before any service-role write on behalf of a non-staff user.
 */
async function userCanAccessProject(
  userId: string,
  role: UserRole,
  projectId: string
): Promise<boolean> {
  if (isBuildViewStaffRole(role)) return true;

  const admin = createServiceRoleClient();

  const { data: assignment } = await admin
    .from("project_assignments")
    .select("id")
    .eq("user_id", userId)
    .eq("project_id", projectId)
    .is("deleted_at", null)
    .maybeSingle();
  if (assignment) return true;

  if (role !== "client_admin") return false;

  const [{ data: profile }, { data: project }] = await Promise.all([
    admin.from("users").select("client_id").eq("id", userId).maybeSingle(),
    admin
      .from("projects")
      .select("client_id")
      .eq("id", projectId)
      .is("deleted_at", null)
      .maybeSingle(),
  ]);

  return Boolean(profile?.client_id && project?.client_id === profile.client_id);
}

const ISSUE_WRITE_COLUMNS = "id, project_id, status, title, resolved_at";

type IssueWriteRow = {
  id: string;
  project_id: string;
  status: IssueStatus;
  title: string;
  resolved_at: string | null;
};

/**
 * Loads an active issue the caller may act on. Falls back to the service role
 * (after an explicit access check) when RLS hides org-wide Client Admin projects.
 */
async function findAccessibleIssue(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  role: UserRole,
  issueId: string
): Promise<{ issue: IssueWriteRow; rlsVisible: boolean }> {
  const { data: visible } = await supabase
    .from("issues")
    .select(ISSUE_WRITE_COLUMNS)
    .eq("id", issueId)
    .is("deleted_at", null)
    .maybeSingle();

  if (visible) return { issue: visible as IssueWriteRow, rlsVisible: true };

  const admin = createServiceRoleClient();
  const { data: hidden } = await admin
    .from("issues")
    .select(ISSUE_WRITE_COLUMNS)
    .eq("id", issueId)
    .is("deleted_at", null)
    .maybeSingle();

  if (!hidden || !(await userCanAccessProject(userId, role, hidden.project_id))) {
    throw new PublicError("Issue not found");
  }

  return { issue: hidden as IssueWriteRow, rlsVisible: false };
}

async function requireIssueStaff() {
  const context = await getSignedInUserWithRole();
  if (!isBuildViewStaffRole(context.role)) {
    throw new PublicError("Only BuildView staff can edit or delete issues.");
  }
  return context;
}

export async function createIssue(data: {
  project_id: string;
  title: string;
  description?: string;
  priority: string;
  status?: string;
  location?: string;
  building?: string;
  floor?: string;
  assigned_to?: string | null;
  due_date?: string | null;
  images?: Array<{
    storage_path: string;
    file_name: string;
    caption?: string;
    sort_order?: number;
  }>;
  /** When true, caller already notifies clients (e.g. upload orchestrator). */
  skipClientNotify?: boolean;
  /** When true, caller creates its own timeline entry (e.g. upload orchestrator). */
  skipTimeline?: boolean;
}) {
  const validated = parseOrThrow(createIssueActionSchema, data);

  const { supabase, user, role } = await getSignedInUserWithRole();

  if (!canCreateProjectIssue(role)) {
    throw new PublicError("You do not have permission to create issues.");
  }

  let projectAccessVerified: boolean | null = null;
  const verifyProjectAccess = async () => {
    projectAccessVerified ??= await userCanAccessProject(user.id, role, validated.project_id);
    return projectAccessVerified;
  };
  const status = (validated.status ?? "open") as IssueStatus;

  if (validated.images && validated.images.length > 0) {
    if (!(await verifyProjectAccess())) {
      throw new PublicError("You do not have access to this project.");
    }
    await verifyStoredUploads(
      UPLOAD_RULES.issueImage,
      validated.images.map((img) => img.storage_path),
      "createIssue"
    );
  }

  const spatial = await resolveSpatialForWrite(supabase, validated.project_id, {
    building: validated.building,
    floor: validated.floor,
  });

  const payload: IssueInsert = {
    project_id: validated.project_id,
    title: validated.title,
    description: validated.description ?? null,
    priority: validated.priority,
    status,
    location: validated.location ?? null,
    building: spatial.building,
    floor: spatial.floor,
    building_id: spatial.building_id,
    floor_id: spatial.floor_id,
    assigned_to: validated.assigned_to ?? null,
    due_date: validated.due_date ?? null,
    resolved_at: resolvedAtForStatus(status),
    created_by: user?.id ?? null,
    updated_by: null,
  };

  let issueId: string | undefined;

  const { data: issue, error } = await supabase
    .from("issues")
    .insert(payload)
    .select("id")
    .single();

  if (!error && issue) {
    issueId = issue.id;
  } else {
    const msg = (error?.message ?? "").toLowerCase();
    const missingSpatial =
      (msg.includes("building") || msg.includes("floor") || msg.includes("schema cache")) &&
      (msg.includes("column") || msg.includes("could not find") || msg.includes("schema cache"));

    if (missingSpatial) {
      const {
        building: _b,
        floor: _f,
        building_id: _bi,
        floor_id: _fi,
        ...basePayload
      } = payload;

      const { data: retryIssue, error: retryError } = await supabase
        .from("issues")
        .insert(basePayload)
        .select("id")
        .single();

      if (!retryError && retryIssue) {
        issueId = retryIssue.id;
      } else {
        const retryMsg = (retryError?.message ?? "").toLowerCase();
        if (
          !retryMsg.includes("row-level") &&
          !retryMsg.includes("permission denied") &&
          !msg.includes("row-level")
        ) {
          throw internalError("createIssue", retryError ?? error);
        }
      }
    }

    if (!issueId) {
      // RLS only covers assigned projects; Client Admins also see org-wide projects.
      if (!(await verifyProjectAccess())) {
        throw new PublicError("You do not have access to this project.");
      }

      const admin = createServiceRoleClient();
      const staffPayload = missingSpatial
        ? (() => {
            const {
              building: _b,
              floor: _f,
              building_id: _bi,
              floor_id: _fi,
              ...base
            } = payload;
            return base;
          })()
        : payload;

      const { data: staffIssue, error: staffError } = await admin
        .from("issues")
        .insert(staffPayload)
        .select("id")
        .single();

      if (staffError || !staffIssue) {
        throw internalError("createIssue", staffError ?? error);
      }
      issueId = staffIssue.id;
    }
  }

  if (validated.images && validated.images.length > 0) {
    const imageRows: IssueImageInsert[] = validated.images.map((img, index) => ({
      issue_id: issueId,
      image_url: img.storage_path,
      storage_path: img.storage_path,
      caption: img.caption ?? null,
      sort_order: img.sort_order ?? index,
      created_by: user?.id ?? null,
      updated_by: null,
    }));

    const { error: imageError } = await supabase.from("issue_images").insert(imageRows);
    if (imageError) {
      if (!(await verifyProjectAccess())) throw internalError("createIssue", imageError);
      const admin = createServiceRoleClient();
      const { error: fallbackImageError } = await admin.from("issue_images").insert(imageRows);
      if (fallbackImageError) throw internalError("createIssue", fallbackImageError);
    }
  }

  if (
    (validated.priority === "critical" || validated.priority === "high") &&
    (await isNotificationRuleEnabled("onCriticalIssue"))
  ) {
    try {
      await notifySuperAdmins({
        title: `${validated.priority === "critical" ? "Critical" : "High"} issue reported`,
        message: validated.title,
        type: "issue_update",
        link: "/admin/issues",
      });
    } catch (err) {
      console.error("[createIssue] notifySuperAdmins", err);
    }
  }

  if (!validated.skipClientNotify) {
    try {
      const projectName = await getProjectNameForNotify(validated.project_id);
      await notifyClientsIfEnabled("onIssueUpdate", validated.project_id, {
        title: "New issue reported",
        message: formatUploadNotifyMessage(validated.title, projectName, "Issues"),
        type: "issue_update",
        link: portalIssuesLink(validated.project_id, issueId),
      });
    } catch (err) {
      console.error("[createIssue] client notify failed:", err);
    }
  }

  if (!validated.skipTimeline) {
    await recordTimelineEntry(
      {
        project_id: validated.project_id,
        title: `Issue reported — ${validated.title}`,
        progress_note: validated.description || `New ${validated.priority} priority issue logged.`,
        building: spatial.building,
        floor: spatial.floor,
      },
      "createIssue"
    );
  }

  revalidateIssuePaths(validated.project_id);
  revalidatePath("/admin/notifications");
  return issueId;
}

export async function updateIssue(data: {
  id: string;
  title?: string;
  description?: string | null;
  priority?: string;
  status?: string;
  location?: string | null;
  assigned_to?: string | null;
  due_date?: string | null;
}) {
  const validation = validate(updateIssueSchema, data);
  if (!validation.success) throw new PublicError(validation.error);

  const { supabase, user } = await requireIssueStaff();

  const { data: existing, error: fetchError } = await supabase
    .from("issues")
    .select("project_id, status, title, resolved_at")
    .eq("id", validation.data.id)
    .is("deleted_at", null)
    .single();

  if (fetchError || !existing) throw new PublicError("Issue not found");

  const update: IssueUpdate = {
    updated_by: user.id,
  };

  if (validation.data.title !== undefined) update.title = validation.data.title;
  if (validation.data.description !== undefined) update.description = validation.data.description;
  if (validation.data.priority !== undefined) update.priority = validation.data.priority;
  if (validation.data.location !== undefined) update.location = validation.data.location;
  if (validation.data.assigned_to !== undefined) update.assigned_to = validation.data.assigned_to;
  if (validation.data.due_date !== undefined) update.due_date = validation.data.due_date;

  if (validation.data.status !== undefined) {
    update.status = validation.data.status;
    update.resolved_at = nextResolvedAt(
      existing.status as IssueStatus,
      existing.resolved_at,
      validation.data.status
    );
  }

  const { error } = await supabase
    .from("issues")
    .update(update)
    .eq("id", validation.data.id);

  if (error) throw internalError("updateIssue", error);

  const nextStatus = validation.data.status;
  if (
    nextStatus &&
    nextStatus !== existing.status &&
    (nextStatus === "resolved" || nextStatus === "closed")
  ) {
    await notifyClientsIfEnabled("onIssueUpdate", existing.project_id, {
      title: nextStatus === "resolved" ? "Issue resolved" : "Issue closed",
      message: existing.title,
      type: "issue_update",
      link: portalIssuesLink(existing.project_id, validation.data.id),
    });
  }

  if (nextStatus) {
    await recordIssueResolution(
      existing.project_id,
      validation.data.title ?? existing.title,
      existing.status as IssueStatus,
      nextStatus as IssueStatus,
      "updateIssue"
    );
  }

  revalidateIssuePaths(existing.project_id);
}

export async function updateIssueStatus(issueId: string, status: string) {
  const validation = validate(updateIssueStatusSchema, { id: issueId, status });
  if (!validation.success) throw new PublicError(validation.error);

  const { supabase, user, role } = await getSignedInUserWithRole();

  if (!canUpdateIssueStatus(role)) {
    throw new PublicError("You do not have permission to update issue status.");
  }

  const { issue: existing, rlsVisible } = await findAccessibleIssue(
    supabase,
    user.id,
    role,
    issueId
  );

  const statusUpdate = {
    status: validation.data.status,
    resolved_at: nextResolvedAt(existing.status, existing.resolved_at, validation.data.status),
    updated_by: user.id,
  };

  let updated = false;
  if (rlsVisible) {
    const { data: updatedRows, error } = await supabase
      .from("issues")
      .update(statusUpdate)
      .eq("id", issueId)
      .select("id");
    if (error) throw internalError("updateIssueStatus", error);
    updated = Boolean(updatedRows && updatedRows.length > 0);
  }

  // RLS can match zero rows for org-wide Client Admin access; findAccessibleIssue
  // or the check below has already verified project access at the app level.
  if (!updated) {
    if (rlsVisible && !(await userCanAccessProject(user.id, role, existing.project_id))) {
      throw new PublicError("You do not have access to this project.");
    }
    const admin = createServiceRoleClient();
    const { error: fallbackError } = await admin
      .from("issues")
      .update(statusUpdate)
      .eq("id", issueId);
    if (fallbackError) throw internalError("updateIssueStatus", fallbackError);
  }

  const nextStatus = validation.data.status;
  if (
    nextStatus !== existing.status &&
    (nextStatus === "resolved" || nextStatus === "closed")
  ) {
    try {
      await notifyClientsIfEnabled("onIssueUpdate", existing.project_id, {
        title: nextStatus === "resolved" ? "Issue resolved" : "Issue closed",
        message: existing.title,
        type: "issue_update",
        link: portalIssuesLink(existing.project_id, issueId),
      });
    } catch (err) {
      console.error("[updateIssueStatus] notify failed:", err);
    }
  }

  await recordIssueResolution(
    existing.project_id,
    existing.title,
    existing.status,
    nextStatus as IssueStatus,
    "updateIssueStatus"
  );

  revalidateIssuePaths(existing.project_id);
}

export async function addIssueImages(
  rawIssueId: string,
  rawImages: Array<{
    storage_path: string;
    file_name: string;
    caption?: string;
    sort_order?: number;
  }>
) {
  const { issueId, images } = parseOrThrow(addIssueImagesSchema, {
    issueId: rawIssueId,
    images: rawImages,
  });
  if (images.length === 0) return;

  const { supabase, user, role } = await getSignedInUserWithRole();
  if (!canCreateProjectIssue(role)) {
    throw new PublicError("You do not have permission to add photos to issues.");
  }

  const { issue, rlsVisible } = await findAccessibleIssue(supabase, user.id, role, issueId);

  // Signed URLs are issued for whatever path a row stores, so rows must point
  // inside this issue's own folder.
  const expectedPrefix = `${issue.project_id}/${issueId}/`;
  if (images.some((img) => !img.storage_path.startsWith(expectedPrefix))) {
    throw new PublicError("Invalid photo location for this issue.");
  }
  await verifyStoredUploads(
    UPLOAD_RULES.issueImage,
    images.map((img) => img.storage_path),
    "addIssueImages"
  );

  const reader = rlsVisible ? supabase : createServiceRoleClient();
  const { count } = await reader
    .from("issue_images")
    .select("*", { count: "exact", head: true })
    .eq("issue_id", issueId)
    .is("deleted_at", null);

  const startOrder = count ?? 0;

  const imageRows: IssueImageInsert[] = images.map((img, index) => ({
    issue_id: issueId,
    image_url: img.storage_path,
    storage_path: img.storage_path,
    caption: img.caption ?? null,
    sort_order: img.sort_order ?? startOrder + index,
    created_by: user.id,
    updated_by: null,
  }));

  let inserted = false;
  if (rlsVisible) {
    const { error } = await supabase.from("issue_images").insert(imageRows);
    if (!error) {
      inserted = true;
    } else if (!(await userCanAccessProject(user.id, role, issue.project_id))) {
      throw internalError("addIssueImages", error);
    }
  }

  if (!inserted) {
    const admin = createServiceRoleClient();
    const { error: fallbackError } = await admin.from("issue_images").insert(imageRows);
    if (fallbackError) throw internalError("addIssueImages", fallbackError);
  }

  revalidateIssuePaths(issue.project_id);
}

export async function deleteIssue(issueId: string) {
  parseOrThrow(uuid("Issue"), issueId);
  const { supabase, user } = await requireIssueStaff();

  const { data: issue, error: fetchError } = await supabase
    .from("issues")
    .select("project_id")
    .eq("id", issueId)
    .is("deleted_at", null)
    .single();

  if (fetchError || !issue) throw new PublicError("Issue not found");

  const now = new Date().toISOString();

  const { error } = await supabase
    .from("issues")
    .update({ deleted_at: now, updated_by: user.id })
    .eq("id", issueId);
  if (error) throw internalError("deleteIssue", error);

  const { error: imagesError } = await supabase
    .from("issue_images")
    .update({ deleted_at: now, updated_by: user.id })
    .eq("issue_id", issueId)
    .is("deleted_at", null);
  if (imagesError) console.error("[deleteIssue] soft-delete images failed:", imagesError);

  revalidateIssuePaths(issue.project_id);
}

export async function deleteIssueImage(imageId: string) {
  parseOrThrow(uuid("Photo"), imageId);
  const { supabase, user } = await requireIssueStaff();

  const { data: image, error: fetchError } = await supabase
    .from("issue_images")
    .select("id, issue:issues!inner(project_id)")
    .eq("id", imageId)
    .is("deleted_at", null)
    .single();

  if (fetchError || !image) throw new PublicError("Photo not found");

  const { error } = await supabase
    .from("issue_images")
    .update({ deleted_at: new Date().toISOString(), updated_by: user.id })
    .eq("id", imageId);
  if (error) throw internalError("deleteIssueImage", error);

  const issue = image.issue as unknown as { project_id: string } | null;
  if (issue?.project_id) revalidateIssuePaths(issue.project_id);
}

export async function getIssueImageSignedUrl(
  imageId: string
): Promise<{ url: string; caption: string | null }> {
  if (!validate(uuid("Image"), imageId).success) throw new PublicError("Image not found");

  const supabase = await createClient();

  const { data: image, error } = await supabase
    .from("issue_images")
    .select("image_url, storage_path, caption")
    .eq("id", imageId)
    .is("deleted_at", null)
    .single();

  if (error || !image) {
    throw new PublicError("Image not found");
  }

  const path = resolveIssueImageStoragePath(image.storage_path, image.image_url);

  if (!path) {
    if (image.image_url?.startsWith("http")) {
      return { url: image.image_url, caption: image.caption };
    }
    throw new PublicError("File not found.");
  }

  const url = await createSignedStorageUrl(STORAGE_BUCKETS.ISSUE_IMAGES, path);
  return { url, caption: image.caption };
}
