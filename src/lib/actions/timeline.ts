"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createSignedStorageUrl } from "@/lib/supabase/storage-server";
import { resolveTimelinePhotoStoragePath } from "@/lib/supabase/storage";
import {
  createTimelineEventSchema,
  updateTimelineEventSchema,
} from "@/lib/validations/timeline";
import type {
  TimelineEventInsert,
  TimelineEventUpdate,
  TimelinePhotoInsert,
} from "@/lib/types";
import { STORAGE_BUCKETS } from "@/lib/types";
import { resolveSpatialForWrite } from "@/lib/admin/spatial-resolve";

function revalidateTimelinePaths(projectId: string) {
  revalidatePath("/admin/timeline");
  revalidatePath(`/dashboard/projects/${projectId}`);
  revalidatePath("/dashboard/projects");
  revalidatePath("/admin");
}

export async function createTimelineEvent(data: {
  project_id: string;
  event_date: string;
  title: string;
  progress_note?: string;
  tour_id?: string | null;
  report_id?: string | null;
  sort_order?: number;
  building?: string | null;
  floor?: string | null;
  status?: "in_progress" | "completed";
  progress_percent?: number | null;
  trades?: Array<{ name: string; percent: number; color?: string }>;
  whats_new?: string[];
  author_name?: string | null;
  photos?: Array<{
    storage_path: string;
    file_name: string;
    caption?: string;
    sort_order?: number;
  }>;
}) {
  const validation = createTimelineEventSchema.safeParse(data);
  if (!validation.success) {
    throw new Error(validation.error.errors[0]?.message ?? "Invalid timeline data");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const validated = validation.data;

  const spatial = await resolveSpatialForWrite(supabase, validated.project_id, {
    building: validated.building,
    floor: validated.floor,
  });

  const payload: TimelineEventInsert = {
    project_id: validated.project_id,
    event_date: validated.event_date,
    title: validated.title,
    progress_note: validated.progress_note ?? null,
    tour_id: validated.tour_id ?? null,
    report_id: validated.report_id ?? null,
    sort_order: validated.sort_order ?? 0,
    status: validated.status ?? "in_progress",
    progress_percent: validated.progress_percent ?? null,
    trades: validated.trades ?? [],
    whats_new: validated.whats_new ?? [],
    author_name: validated.author_name?.trim() || null,
    building: spatial.building,
    floor: spatial.floor,
    building_id: spatial.building_id,
    floor_id: spatial.floor_id,
    created_by: user?.id ?? null,
    updated_by: null,
  };

  const { data: event, error } = await supabase
    .from("timeline_events")
    .insert(payload)
    .select("id")
    .single();

  if (error || !event) {
    throw new Error(error?.message ?? "Failed to create timeline event");
  }

  if (data.photos && data.photos.length > 0) {
    await insertTimelinePhotos(event.id, data.photos, user?.id ?? null);
  }

  revalidateTimelinePaths(validated.project_id);
  return event.id;
}

export async function updateTimelineEvent(data: {
  id: string;
  event_date?: string;
  title?: string;
  progress_note?: string | null;
  tour_id?: string | null;
  report_id?: string | null;
  sort_order?: number;
  status?: "in_progress" | "completed";
  progress_percent?: number | null;
  trades?: Array<{ name: string; percent: number; color?: string }>;
  whats_new?: string[];
  author_name?: string | null;
}) {
  const validation = updateTimelineEventSchema.safeParse(data);
  if (!validation.success) {
    throw new Error(validation.error.errors[0]?.message ?? "Invalid timeline data");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: existing, error: fetchError } = await supabase
    .from("timeline_events")
    .select("project_id")
    .eq("id", validation.data.id)
    .is("deleted_at", null)
    .single();

  if (fetchError || !existing) throw new Error("Timeline event not found");

  const update: TimelineEventUpdate = {
    updated_by: user?.id ?? null,
  };

  if (validation.data.event_date !== undefined) update.event_date = validation.data.event_date;
  if (validation.data.title !== undefined) update.title = validation.data.title;
  if (validation.data.progress_note !== undefined) {
    update.progress_note = validation.data.progress_note;
  }
  if (validation.data.tour_id !== undefined) update.tour_id = validation.data.tour_id;
  if (validation.data.report_id !== undefined) update.report_id = validation.data.report_id;
  if (validation.data.sort_order !== undefined) update.sort_order = validation.data.sort_order;
  if (validation.data.status !== undefined) update.status = validation.data.status;
  if (validation.data.progress_percent !== undefined) {
    update.progress_percent = validation.data.progress_percent;
  }
  if (validation.data.trades !== undefined) update.trades = validation.data.trades;
  if (validation.data.whats_new !== undefined) update.whats_new = validation.data.whats_new;
  if (validation.data.author_name !== undefined) {
    update.author_name = validation.data.author_name?.trim() || null;
  }

  const { error } = await supabase
    .from("timeline_events")
    .update(update)
    .eq("id", validation.data.id);

  if (error) throw new Error(error.message);

  revalidateTimelinePaths(existing.project_id);
}

async function insertTimelinePhotos(
  eventId: string,
  photos: Array<{
    storage_path: string;
    file_name: string;
    caption?: string;
    sort_order?: number;
  }>,
  userId: string | null
) {
  const supabase = await createClient();

  const { count } = await supabase
    .from("timeline_photos")
    .select("*", { count: "exact", head: true })
    .eq("timeline_event_id", eventId)
    .is("deleted_at", null);

  const startOrder = count ?? 0;

  const rows: TimelinePhotoInsert[] = photos.map((photo, index) => ({
    timeline_event_id: eventId,
    image_url: photo.storage_path,
    storage_path: photo.storage_path,
    caption: photo.caption ?? null,
    sort_order: photo.sort_order ?? startOrder + index,
    created_by: userId,
    updated_by: null,
  }));

  const { error } = await supabase.from("timeline_photos").insert(rows);
  if (error) throw new Error(error.message);
}

export async function addTimelinePhotos(
  eventId: string,
  photos: Array<{
    storage_path: string;
    file_name: string;
    caption?: string;
    sort_order?: number;
  }>
) {
  if (photos.length === 0) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: event, error: fetchError } = await supabase
    .from("timeline_events")
    .select("project_id")
    .eq("id", eventId)
    .is("deleted_at", null)
    .single();

  if (fetchError || !event) throw new Error("Timeline event not found");

  await insertTimelinePhotos(eventId, photos, user?.id ?? null);
  revalidateTimelinePaths(event.project_id);
}

export async function getTimelinePhotoSignedUrl(
  photoId: string
): Promise<{ url: string; caption: string | null }> {
  const supabase = await createClient();

  const { data: photo, error } = await supabase
    .from("timeline_photos")
    .select("image_url, storage_path, caption")
    .eq("id", photoId)
    .is("deleted_at", null)
    .single();

  if (error || !photo) {
    throw new Error("Photo not found");
  }

  const path = resolveTimelinePhotoStoragePath(photo.storage_path, photo.image_url);

  if (!path) {
    if (photo.image_url?.startsWith("http")) {
      return { url: photo.image_url, caption: photo.caption };
    }
    throw new Error("Photo path not found");
  }

  const url = await createSignedStorageUrl(STORAGE_BUCKETS.TIMELINE_PHOTOS, path);
  return { url, caption: photo.caption };
}
