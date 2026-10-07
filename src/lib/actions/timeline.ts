"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { isRlsOrPermissionError } from "@/lib/supabase/rls";
import { createSignedStorageUrl } from "@/lib/supabase/storage-server";
import { resolveTimelinePhotoStoragePath } from "@/lib/supabase/storage";
import {
  addTimelinePhotosSchema,
  createTimelineEventSchema,
  updateTimelineEventSchema,
  type TimelinePhotoData,
} from "@/lib/validations/timeline";
import { parseOrThrow, validate } from "@/lib/validations/parse";
import { uuid } from "@/lib/validations/primitives";
import type {
  TimelineEventInsert,
  TimelineEventUpdate,
  TimelinePhotoInsert,
  UserRole,
} from "@/lib/types";
import { STORAGE_BUCKETS } from "@/lib/types";
import { resolveSpatialForWrite } from "@/lib/admin/spatial-resolve";
import { notifyClientsIfEnabled } from "@/lib/notifications/server";
import { portalTimelineLink } from "@/lib/portal/notification-links";
import { assertCanUploadToProject } from "@/lib/auth/upload-access";
import { isBuildViewStaffRole } from "@/lib/auth/roles";

type TimelinePhotoInput = {
  storage_path: string;
  file_name: string;
  caption?: string;
  sort_order?: number;
};

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;
type SupabaseAdminClient = ReturnType<typeof createServiceRoleClient>;

function revalidateTimelinePaths(projectId: string) {
  revalidatePath("/admin/timeline");
  revalidatePath("/dashboard/timeline");
  revalidatePath(`/dashboard/projects/${projectId}`);
  revalidatePath(`/admin/projects/${projectId}`);
  revalidatePath("/dashboard/projects");
  revalidatePath("/dashboard");
  revalidatePath("/admin");
}

function isMissingColumnError(message: string | undefined): boolean {
  const msg = (message ?? "").toLowerCase();
  return msg.includes("column") || msg.includes("schema cache") || msg.includes("could not find");
}

/** Strips columns added by later migrations so older databases still accept the insert. */
function withoutOptionalColumns(payload: TimelineEventInsert): TimelineEventInsert {
  const {
    status: _status,
    progress_percent: _progress,
    trades: _trades,
    whats_new: _whatsNew,
    author_name: _author,
    building: _building,
    floor: _floor,
    building_id: _buildingId,
    floor_id: _floorId,
    ...base
  } = payload;
  return base as TimelineEventInsert;
}

async function insertEventRow(
  client: SupabaseServerClient | SupabaseAdminClient,
  payload: TimelineEventInsert
): Promise<{ id: string | null; error: string | null }> {
  const { data, error } = await client
    .from("timeline_events")
    .insert(payload)
    .select("id")
    .single();

  if (!error && data) return { id: data.id, error: null };

  if (isMissingColumnError(error?.message)) {
    const { data: retry, error: retryError } = await client
      .from("timeline_events")
      .insert(withoutOptionalColumns(payload))
      .select("id")
      .single();
    if (!retryError && retry) return { id: retry.id, error: null };
    return { id: null, error: retryError?.message ?? "Failed to create timeline event" };
  }

  return { id: null, error: error?.message ?? "Failed to create timeline event" };
}

async function requireTimelineStaff() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("You must be signed in");

  const { data: me } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (!me?.role || !isBuildViewStaffRole(me.role as UserRole)) {
    throw new Error("Only BuildView staff can edit or delete timeline milestones.");
  }
  return { supabase, user };
}

/** A milestone may only link a tour or report from its own project. */
async function assertLinkedContentBelongsToProject(
  projectId: string,
  tourId: string | null | undefined,
  reportId: string | null | undefined
) {
  if (!tourId && !reportId) return;
  const admin = createServiceRoleClient();

  if (tourId) {
    const { data: tour } = await admin
      .from("project_tours")
      .select("project_id")
      .eq("id", tourId)
      .is("deleted_at", null)
      .maybeSingle();
    if (!tour || tour.project_id !== projectId) {
      throw new Error("The selected virtual tour does not belong to this project.");
    }
  }

  if (reportId) {
    const { data: report } = await admin
      .from("reports")
      .select("project_id")
      .eq("id", reportId)
      .is("deleted_at", null)
      .maybeSingle();
    if (!report || report.project_id !== projectId) {
      throw new Error("The selected report does not belong to this project.");
    }
  }
}

/** Service-role lookup; callers must authorize against the returned project_id. */
async function getActiveEventProjectId(eventId: string): Promise<string> {
  const admin = createServiceRoleClient();
  const { data: event } = await admin
    .from("timeline_events")
    .select("project_id")
    .eq("id", eventId)
    .is("deleted_at", null)
    .maybeSingle();
  if (!event) throw new Error("Timeline event not found");
  return event.project_id;
}

/** Caller must have already authorized the upload for this event's project. */
async function insertTimelinePhotos(
  eventId: string,
  projectId: string,
  photos: TimelinePhotoData[],
  userId: string
) {
  // Signed URLs are issued for whatever path a row stores, so rows must point
  // inside this event's own folder.
  const expectedPrefix = `${projectId}/${eventId}/`;
  if (photos.some((photo) => !photo.storage_path.startsWith(expectedPrefix))) {
    throw new Error("Invalid photo location for this milestone.");
  }

  const admin = createServiceRoleClient();
  const { count } = await admin
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

  const supabase = await createClient();
  const { error } = await supabase.from("timeline_photos").insert(rows);
  if (!error) return;

  if (!isRlsOrPermissionError(error.message)) throw new Error(error.message);

  const { error: retryError } = await admin.from("timeline_photos").insert(rows);
  if (retryError) throw new Error(retryError.message);
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
  photos?: TimelinePhotoInput[];
  /** When true, caller already notifies clients (e.g. upload orchestrator). */
  skipClientNotify?: boolean;
}) {
  const validated = parseOrThrow(createTimelineEventSchema, data);

  const auth = await assertCanUploadToProject(validated.project_id, "upload");
  await assertLinkedContentBelongsToProject(
    validated.project_id,
    validated.tour_id,
    validated.report_id
  );

  const supabase = await createClient();
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
    created_by: auth.userId,
    updated_by: null,
  };

  let { id: eventId, error } = await insertEventRow(supabase, payload);

  // RLS only covers assigned projects; assertCanUploadToProject has already
  // authorized org-wide Client Admin access at the app level.
  if (!eventId && error && isRlsOrPermissionError(error)) {
    ({ id: eventId, error } = await insertEventRow(createServiceRoleClient(), payload));
  }

  if (!eventId) throw new Error(error ?? "Failed to create timeline event");

  if (validated.photos && validated.photos.length > 0) {
    await insertTimelinePhotos(eventId, validated.project_id, validated.photos, auth.userId);
  }

  if (!validated.skipClientNotify) {
    try {
      await notifyClientsIfEnabled("onTimeline", validated.project_id, {
        title: "Timeline updated",
        message: validated.title,
        type: "project_update",
        link: portalTimelineLink(validated.project_id),
      });
    } catch (err) {
      console.error("[createTimelineEvent] client notify failed:", err);
    }
  }

  revalidateTimelinePaths(validated.project_id);
  return eventId;
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
  const validation = validate(updateTimelineEventSchema, data);
  if (!validation.success) throw new Error(validation.error);

  const { supabase, user } = await requireTimelineStaff();

  const { data: existing, error: fetchError } = await supabase
    .from("timeline_events")
    .select("project_id")
    .eq("id", validation.data.id)
    .is("deleted_at", null)
    .single();

  if (fetchError || !existing) throw new Error("Timeline event not found");

  await assertLinkedContentBelongsToProject(
    existing.project_id,
    validation.data.tour_id,
    validation.data.report_id
  );

  const update: TimelineEventUpdate = {
    updated_by: user.id,
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

export async function addTimelinePhotos(rawEventId: string, rawPhotos: TimelinePhotoInput[]) {
  const { eventId, photos } = parseOrThrow(addTimelinePhotosSchema, {
    eventId: rawEventId,
    photos: rawPhotos,
  });
  if (photos.length === 0) return;

  const projectId = await getActiveEventProjectId(eventId);
  const auth = await assertCanUploadToProject(projectId, "upload");

  await insertTimelinePhotos(eventId, projectId, photos, auth.userId);
  revalidateTimelinePaths(projectId);
}

export async function deleteTimelineEvent(eventId: string) {
  parseOrThrow(uuid("Timeline event"), eventId);
  const { supabase, user } = await requireTimelineStaff();

  const { data: event, error: fetchError } = await supabase
    .from("timeline_events")
    .select("project_id")
    .eq("id", eventId)
    .is("deleted_at", null)
    .single();

  if (fetchError || !event) throw new Error("Timeline event not found");

  const now = new Date().toISOString();

  const { error } = await supabase
    .from("timeline_events")
    .update({ deleted_at: now, updated_by: user.id })
    .eq("id", eventId);
  if (error) throw new Error(error.message);

  const { error: photosError } = await supabase
    .from("timeline_photos")
    .update({ deleted_at: now, updated_by: user.id })
    .eq("timeline_event_id", eventId)
    .is("deleted_at", null);
  if (photosError) console.error("[deleteTimelineEvent] soft-delete photos failed:", photosError);

  revalidateTimelinePaths(event.project_id);
}

export async function deleteTimelinePhoto(photoId: string) {
  parseOrThrow(uuid("Photo"), photoId);
  const { supabase, user } = await requireTimelineStaff();

  const { data: photo, error: fetchError } = await supabase
    .from("timeline_photos")
    .select("id, event:timeline_events!inner(project_id)")
    .eq("id", photoId)
    .is("deleted_at", null)
    .single();

  if (fetchError || !photo) throw new Error("Photo not found");

  const { error } = await supabase
    .from("timeline_photos")
    .update({ deleted_at: new Date().toISOString(), updated_by: user.id })
    .eq("id", photoId);
  if (error) throw new Error(error.message);

  const event = photo.event as unknown as { project_id: string } | null;
  if (event?.project_id) revalidateTimelinePaths(event.project_id);
}

export async function getTimelinePhotoSignedUrl(
  photoId: string
): Promise<{ url: string; caption: string | null }> {
  if (!validate(uuid("Photo"), photoId).success) throw new Error("Photo not found");

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
