"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createSignedStorageUrl } from "@/lib/supabase/storage-server";
import { resolveIssueImageStoragePath } from "@/lib/supabase/storage";
import { notifyClientsIfEnabled, notifySuperAdmins } from "@/lib/actions/notifications";
import { isNotificationRuleEnabled } from "@/lib/actions/platform-settings";
import {
  createIssueSchema,
  updateIssueSchema,
  updateIssueStatusSchema,
} from "@/lib/validations/issue";
import type {
  IssueImageInsert,
  IssueInsert,
  IssueStatus,
  IssueUpdate,
} from "@/lib/types";
import { STORAGE_BUCKETS } from "@/lib/types";
import { resolveSpatialForWrite } from "@/lib/admin/spatial-resolve";

function revalidateIssuePaths(projectId: string) {
  revalidatePath("/admin/issues");
  revalidatePath("/dashboard/issues");
  revalidatePath(`/dashboard/projects/${projectId}`);
  revalidatePath("/dashboard");
  revalidatePath("/admin");
}

function resolvedAtForStatus(status: IssueStatus): string | null {
  return status === "resolved" || status === "closed" ? new Date().toISOString() : null;
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
}) {
  const validation = createIssueSchema.safeParse(data);
  if (!validation.success) {
    throw new Error(validation.error.errors[0]?.message ?? "Invalid issue data");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const validated = validation.data;
  const status = (validated.status ?? "open") as IssueStatus;

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

  const { data: issue, error } = await supabase
    .from("issues")
    .insert(payload)
    .select("id")
    .single();

  if (error || !issue) throw new Error(error?.message ?? "Failed to create issue");

  if (data.images && data.images.length > 0) {
    const imageRows: IssueImageInsert[] = data.images.map((img, index) => ({
      issue_id: issue.id,
      image_url: img.storage_path,
      storage_path: img.storage_path,
      caption: img.caption ?? null,
      sort_order: img.sort_order ?? index,
      created_by: user?.id ?? null,
      updated_by: null,
    }));

    const { error: imageError } = await supabase.from("issue_images").insert(imageRows);
    if (imageError) throw new Error(imageError.message);
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

  await notifyClientsIfEnabled("onIssueUpdate", validated.project_id, {
    title: "New issue reported",
    message: validated.title,
    type: "issue_update",
    link: `/dashboard/projects/${validated.project_id}?tab=issues`,
  });

  revalidateIssuePaths(validated.project_id);
  revalidatePath("/admin/notifications");
  return issue.id;
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
  const validation = updateIssueSchema.safeParse(data);
  if (!validation.success) {
    throw new Error(validation.error.errors[0]?.message ?? "Invalid issue data");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: existing, error: fetchError } = await supabase
    .from("issues")
    .select("project_id, status, title")
    .eq("id", validation.data.id)
    .is("deleted_at", null)
    .single();

  if (fetchError || !existing) throw new Error("Issue not found");

  const update: IssueUpdate = {
    updated_by: user?.id ?? null,
  };

  if (validation.data.title !== undefined) update.title = validation.data.title;
  if (validation.data.description !== undefined) update.description = validation.data.description;
  if (validation.data.priority !== undefined) update.priority = validation.data.priority;
  if (validation.data.location !== undefined) update.location = validation.data.location;
  if (validation.data.assigned_to !== undefined) update.assigned_to = validation.data.assigned_to;
  if (validation.data.due_date !== undefined) update.due_date = validation.data.due_date;

  if (validation.data.status !== undefined) {
    update.status = validation.data.status;
    update.resolved_at = resolvedAtForStatus(validation.data.status);
  }

  const { error } = await supabase
    .from("issues")
    .update(update)
    .eq("id", validation.data.id);

  if (error) throw new Error(error.message);

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
      link: `/dashboard/projects/${existing.project_id}?tab=issues`,
    });
  }

  revalidateIssuePaths(existing.project_id);
}

export async function updateIssueStatus(issueId: string, status: string) {
  const validation = updateIssueStatusSchema.safeParse({ id: issueId, status });
  if (!validation.success) {
    throw new Error(validation.error.errors[0]?.message ?? "Invalid status");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: existing, error: fetchError } = await supabase
    .from("issues")
    .select("project_id, status, title")
    .eq("id", issueId)
    .is("deleted_at", null)
    .single();

  if (fetchError || !existing) throw new Error("Issue not found");

  const { error } = await supabase
    .from("issues")
    .update({
      status: validation.data.status,
      resolved_at: resolvedAtForStatus(validation.data.status),
      updated_by: user?.id ?? null,
    })
    .eq("id", issueId);

  if (error) throw new Error(error.message);

  const nextStatus = validation.data.status;
  if (
    nextStatus !== existing.status &&
    (nextStatus === "resolved" || nextStatus === "closed")
  ) {
    await notifyClientsIfEnabled("onIssueUpdate", existing.project_id, {
      title: nextStatus === "resolved" ? "Issue resolved" : "Issue closed",
      message: existing.title,
      type: "issue_update",
      link: `/dashboard/projects/${existing.project_id}?tab=issues`,
    });
  }

  revalidateIssuePaths(existing.project_id);
}

export async function addIssueImages(
  issueId: string,
  images: Array<{
    storage_path: string;
    file_name: string;
    caption?: string;
    sort_order?: number;
  }>
) {
  if (images.length === 0) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: issue, error: fetchError } = await supabase
    .from("issues")
    .select("project_id")
    .eq("id", issueId)
    .is("deleted_at", null)
    .single();

  if (fetchError || !issue) throw new Error("Issue not found");

  const { count } = await supabase
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
    created_by: user?.id ?? null,
    updated_by: null,
  }));

  const { error } = await supabase.from("issue_images").insert(imageRows);
  if (error) throw new Error(error.message);

  revalidateIssuePaths(issue.project_id);
}

export async function getIssueImageSignedUrl(
  imageId: string
): Promise<{ url: string; caption: string | null }> {
  const supabase = await createClient();

  const { data: image, error } = await supabase
    .from("issue_images")
    .select("image_url, storage_path, caption")
    .eq("id", imageId)
    .is("deleted_at", null)
    .single();

  if (error || !image) {
    throw new Error("Image not found");
  }

  const path = resolveIssueImageStoragePath(image.storage_path, image.image_url);

  if (!path) {
    if (image.image_url?.startsWith("http")) {
      return { url: image.image_url, caption: image.caption };
    }
    throw new Error("Image path not found");
  }

  const url = await createSignedStorageUrl(STORAGE_BUCKETS.ISSUE_IMAGES, path);
  return { url, caption: image.caption };
}

export async function getIssueImageSignedUrls(
  imageIds: string[]
): Promise<Record<string, string>> {
  const results: Record<string, string> = {};

  await Promise.all(
    imageIds.map(async (id) => {
      try {
        const { url } = await getIssueImageSignedUrl(id);
        results[id] = url;
      } catch {
        // Skip images that cannot be resolved
      }
    })
  );

  return results;
}
