"use server";

import { revalidatePath } from "next/cache";
import { createClient, requireBuildViewStaff } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { isRlsOrPermissionError } from "@/lib/supabase/rls";
import {
  STORAGE_BUCKETS,
  type ProjectMedia,
  type ProjectMediaInsert,
  type ProjectMediaType,
} from "@/lib/types";
import { type ProjectMediaGroups, type ProjectMediaItem } from "@/lib/project-media";
import { parseOrThrow, validate } from "@/lib/validations/parse";
import {
  addProjectMediaSchema,
  projectMediaDirectionSchema,
  projectMediaIdSchema,
  projectMediaProjectIdSchema,
  projectMediaTitleSchema,
} from "@/lib/validations/project-media";

const BUCKET = STORAGE_BUCKETS.PROJECT_MEDIA;
/** Long enough to watch a video after the page has been open for a while. */
const SIGNED_URL_TTL_SECONDS = 60 * 60 * 6;

const EMPTY_GROUPS: ProjectMediaGroups = { videos: [], photos: [] };

function revalidateProjectMedia(projectId: string) {
  revalidatePath(`/dashboard/projects/${projectId}`);
  revalidatePath(`/admin/projects/${projectId}`);
}

function sortMedia(rows: ProjectMedia[]): ProjectMedia[] {
  return [...rows].sort(
    (a, b) => a.sort_order - b.sort_order || a.created_at.localeCompare(b.created_at)
  );
}

async function withSignedUrls(rows: ProjectMedia[]): Promise<ProjectMediaItem[]> {
  if (rows.length === 0) return [];
  const supabase = await createClient();
  const { data } = await supabase.storage
    .from(BUCKET)
    .createSignedUrls(
      rows.map((row) => row.storage_path),
      SIGNED_URL_TTL_SECONDS
    );
  const urlByPath = new Map(
    (data ?? []).map((entry) => [entry.path, entry.error ? null : entry.signedUrl])
  );
  return rows.map((row) => ({ ...row, url: urlByPath.get(row.storage_path) ?? null }));
}

async function groupWithUrls(rows: ProjectMedia[]): Promise<ProjectMediaGroups> {
  const items = await withSignedUrls(sortMedia(rows));
  return {
    videos: items.filter((item) => item.media_type === "video"),
    photos: items.filter((item) => item.media_type === "photo"),
  };
}

/** Portal read: RLS limits rows to projects the viewer can access. */
export async function getProjectMedia(projectId: string): Promise<ProjectMediaGroups> {
  if (!validate(projectMediaProjectIdSchema, projectId).success) return EMPTY_GROUPS;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("project_media")
    .select("*")
    .eq("project_id", projectId)
    .is("deleted_at", null);

  // Missing table (migration 027 not applied) must not break the project page.
  if (error || !data) return EMPTY_GROUPS;
  return groupWithUrls(data as ProjectMedia[]);
}

/**
 * Short-lived URL that downloads the file under its original name. Cross-origin
 * signed URLs ignore <a download>, so the attachment header must come from storage.
 */
export async function getProjectMediaDownloadUrl(id: string): Promise<string> {
  parseOrThrow(projectMediaIdSchema, id);
  const supabase = await createClient();
  const { data: row } = await supabase
    .from("project_media")
    .select("storage_path, file_name")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (!row) throw new Error("File not found.");

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(row.storage_path, 60, { download: row.file_name });
  if (error || !data?.signedUrl) {
    throw new Error(error?.message ?? "Could not prepare the download.");
  }
  return data.signedUrl;
}

/** Admin read: whether the project belongs to a portfolio client, plus its media. */
export async function getProjectMediaAdmin(
  projectId: string
): Promise<{ isPortfolio: boolean; media: ProjectMediaGroups }> {
  if (!validate(projectMediaProjectIdSchema, projectId).success) {
    return { isPortfolio: false, media: EMPTY_GROUPS };
  }
  await requireBuildViewStaff();
  const admin = createServiceRoleClient();

  const { data: project } = await admin
    .from("projects")
    .select("client:clients(dashboard_type)")
    .eq("id", projectId)
    .maybeSingle();

  const client = (project as { client: { dashboard_type: string | null } | null } | null)?.client;
  const isPortfolio = client?.dashboard_type === "portfolio";

  return { isPortfolio, media: await getProjectMedia(projectId) };
}

export async function addProjectMedia(fields: {
  project_id: string;
  media_type: ProjectMediaType;
  title: string;
  storage_path: string;
  file_name: string;
  mime_type: string;
  file_size: number;
}): Promise<ProjectMediaItem> {
  const input = parseOrThrow(addProjectMediaSchema, fields);
  const actor = await requireBuildViewStaff();

  const supabase = await createClient();

  const { count } = await supabase
    .from("project_media")
    .select("id", { count: "exact", head: true })
    .eq("project_id", input.project_id)
    .eq("media_type", input.media_type)
    .is("deleted_at", null);

  const payload: ProjectMediaInsert = {
    project_id: input.project_id,
    media_type: input.media_type,
    title: input.title,
    storage_path: input.storage_path,
    file_name: input.file_name,
    mime_type: input.mime_type,
    file_size: input.file_size,
    sort_order: count ?? 0,
    created_by: actor.id,
    updated_by: actor.id,
  };

  let { data, error } = await supabase.from("project_media").insert(payload).select("*").single();
  if (error && isRlsOrPermissionError(error.message)) {
    ({ data, error } = await createServiceRoleClient()
      .from("project_media")
      .insert(payload)
      .select("*")
      .single());
  }
  if (error || !data) throw new Error(error?.message ?? "Failed to save media.");

  revalidateProjectMedia(input.project_id);
  const [item] = await withSignedUrls([data as ProjectMedia]);
  return item;
}

async function getMediaRow(id: string): Promise<ProjectMedia> {
  const { data, error } = await createServiceRoleClient()
    .from("project_media")
    .select("*")
    .eq("id", id)
    .is("deleted_at", null)
    .single();
  if (error || !data) throw new Error("Media not found.");
  return data as ProjectMedia;
}

export async function renameProjectMedia(id: string, title: string) {
  parseOrThrow(projectMediaIdSchema, id);
  const trimmed = parseOrThrow(projectMediaTitleSchema, title);
  const actor = await requireBuildViewStaff();

  const row = await getMediaRow(id);
  const { error } = await createServiceRoleClient()
    .from("project_media")
    .update({ title: trimmed, updated_by: actor.id })
    .eq("id", id);
  if (error) throw new Error(error.message);

  revalidateProjectMedia(row.project_id);
}

export async function moveProjectMedia(id: string, direction: "up" | "down") {
  parseOrThrow(projectMediaIdSchema, id);
  parseOrThrow(projectMediaDirectionSchema, direction);
  const actor = await requireBuildViewStaff();
  const row = await getMediaRow(id);
  const admin = createServiceRoleClient();

  const { data: siblings, error } = await admin
    .from("project_media")
    .select("*")
    .eq("project_id", row.project_id)
    .eq("media_type", row.media_type)
    .is("deleted_at", null);
  if (error || !siblings) throw new Error(error?.message ?? "Failed to reorder.");

  const ordered = sortMedia(siblings as ProjectMedia[]);
  const index = ordered.findIndex((item) => item.id === id);
  const target = direction === "up" ? index - 1 : index + 1;
  if (index < 0 || target < 0 || target >= ordered.length) return;

  [ordered[index], ordered[target]] = [ordered[target], ordered[index]];

  await Promise.all(
    ordered.map((item, position) =>
      item.sort_order === position
        ? null
        : admin
            .from("project_media")
            .update({ sort_order: position, updated_by: actor.id })
            .eq("id", item.id)
    )
  );

  revalidateProjectMedia(row.project_id);
}

export async function deleteProjectMedia(id: string) {
  parseOrThrow(projectMediaIdSchema, id);
  const actor = await requireBuildViewStaff();
  const row = await getMediaRow(id);
  const admin = createServiceRoleClient();

  const { error } = await admin
    .from("project_media")
    .update({ deleted_at: new Date().toISOString(), deleted_by: actor.id })
    .eq("id", id);
  if (error) throw new Error(error.message);

  const { error: removeError } = await admin.storage.from(BUCKET).remove([row.storage_path]);
  if (removeError) console.error("[deleteProjectMedia] storage remove failed:", removeError);

  revalidateProjectMedia(row.project_id);
}
