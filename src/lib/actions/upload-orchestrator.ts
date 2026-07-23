"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { normalizeMatterportUrl } from "@/lib/matterport";
import { createTourSchema } from "@/lib/validations/tour";
import { createReportSchema } from "@/lib/validations/report";
import { createDocumentSchema } from "@/lib/validations/document";
import { createIssueSchema } from "@/lib/validations/issue";
import { createTimelineEvent } from "@/lib/actions/timeline";
import type {
  ActivityLogInsert,
  DocumentCategory,
  ProjectTourInsert,
  ReportType,
} from "@/lib/types";
import { createReport, createDocument } from "@/lib/actions/admin";
import { addTimelinePhotos } from "@/lib/actions/timeline";
import { createIssue } from "@/lib/actions/issues";
import { notifyProjectClientUsers } from "@/lib/actions/notifications";
import { isNotificationRuleEnabled } from "@/lib/actions/platform-settings";
import { resolveSpatialForWrite } from "@/lib/admin/spatial-resolve";
import { buildTourDescription } from "@/lib/admin/tour-metadata";

export type UploadCategory =
  | "matterport"
  | "progress_report"
  | "inspection_report"
  | "safety_report"
  | "drawings"
  | "boqs"
  | "contracts"
  | "invoices_doc"
  | "site_photos"
  | "timeline_update"
  | "issue"
  | "other";

export type UploadResult = {
  tourId?: string;
  reportId?: string;
  documentId?: string;
  eventId?: string;
  issueId?: string;
};

async function logActivity(
  projectId: string,
  action: string,
  entityType: string,
  entityId?: string | null,
  metadata?: Record<string, string | undefined>
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const meta: Record<string, string> = {};
  if (metadata) {
    for (const [key, value] of Object.entries(metadata)) {
      if (value !== undefined) meta[key] = value;
    }
  }

  const payload: ActivityLogInsert = {
    user_id: user?.id ?? null,
    project_id: projectId,
    action,
    entity_type: entityType,
    entity_id: entityId ?? null,
    metadata: meta,
    ip_address: null,
    user_agent: null,
  };

  await supabase.from("activity_logs").insert(payload);
}

export async function uploadMatterportWithAutomation(data: {
  project_id: string;
  name: string;
  matterport_url: string;
  capture_date?: string;
  building?: string;
  floor?: string;
  building_id?: string;
  floor_id?: string;
  engineer?: string;
  progress_note?: string;
}): Promise<UploadResult> {
  const supabase = await createClient();

  const spatial = await resolveSpatialForWrite(supabase, data.project_id, {
    building: data.building,
    floor: data.floor,
    building_id: data.building_id,
    floor_id: data.floor_id,
  });

  const parsed = createTourSchema.safeParse({
    project_id: data.project_id,
    name: data.name,
    matterport_url: data.matterport_url,
    capture_date: data.capture_date,
    description: buildTourDescription({
      building: spatial.building ?? undefined,
      floor: spatial.floor ?? undefined,
      building_id: spatial.building_id,
      floor_id: spatial.floor_id,
      engineer: data.engineer,
      notes: data.progress_note,
    }),
  });

  if (!parsed.success) {
    throw new Error(parsed.error.errors[0]?.message ?? "Invalid tour data");
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const payload: ProjectTourInsert = {
    project_id: parsed.data.project_id,
    name: parsed.data.name,
    matterport_url: normalizeMatterportUrl(parsed.data.matterport_url),
    capture_date: parsed.data.capture_date ?? null,
    description: parsed.data.description ?? null,
    building_id: spatial.building_id,
    floor_id: spatial.floor_id,
    created_by: user?.id ?? null,
  };

  const { data: tour, error } = await supabase
    .from("project_tours")
    .insert(payload)
    .select("id")
    .single();

  if (error || !tour) throw new Error(error?.message ?? "Failed to create tour");

  const eventDate = parsed.data.capture_date ?? new Date().toISOString().split("T")[0];

  await createTimelineEvent({
    project_id: parsed.data.project_id,
    event_date: eventDate,
    title: `Matterport scan — ${parsed.data.name}`,
    progress_note:
      data.progress_note ??
      `New Matterport tour uploaded${spatial.building ? ` for ${spatial.building}` : ""}${spatial.floor ? ` · ${spatial.floor}` : ""}.`,
    tour_id: tour.id,
    building: spatial.building ?? undefined,
    floor: spatial.floor ?? undefined,
    skipClientNotify: true,
  });

  await logActivity(
    parsed.data.project_id,
    `Matterport tour uploaded: ${parsed.data.name}`,
    "project_tour",
    tour.id,
    {
      building: spatial.building ?? undefined,
      floor: spatial.floor ?? undefined,
      building_id: spatial.building_id ?? undefined,
      floor_id: spatial.floor_id ?? undefined,
    }
  );

  if (await isNotificationRuleEnabled("onUpload")) {
    await notifyProjectClientUsers(parsed.data.project_id, {
      title: "New Matterport scan available",
      message: `${parsed.data.name} has been uploaded to your project timeline.`,
      type: "project_update",
      link: `/dashboard/projects/${parsed.data.project_id}`,
    });
  }

  revalidatePaths(parsed.data.project_id);
  return { tourId: tour.id };
}

export async function uploadReportWithAutomation(data: {
  project_id: string;
  title: string;
  report_type: ReportType;
  report_date: string;
  storage_path: string;
  file_name: string;
  file_size?: number;
  mime_type?: string;
  description?: string;
  building?: string;
  floor?: string;
}): Promise<UploadResult> {
  const validation = createReportSchema.safeParse(data);
  if (!validation.success) {
    throw new Error(validation.error.errors[0]?.message ?? "Invalid report data");
  }

  const reportId = await createReport({
    ...validation.data,
    building: validation.data.building ?? undefined,
    floor: validation.data.floor ?? undefined,
    skipClientNotify: true,
  });

  await createTimelineEvent({
    project_id: data.project_id,
    event_date: data.report_date,
    title: `Report uploaded — ${data.title}`,
    progress_note: data.description ?? `New ${data.report_type.replace(/_/g, " ")} added to project.`,
    report_id: reportId,
    building: data.building ?? null,
    floor: data.floor ?? null,
    skipClientNotify: true,
  });

  await logActivity(data.project_id, `Report uploaded: ${data.title}`, "report", reportId);

  if (await isNotificationRuleEnabled("onUpload")) {
    await notifyProjectClientUsers(data.project_id, {
      title: "New report uploaded",
      message: `${data.title} is now available in your project portal.`,
      type: "project_update",
      link: `/dashboard/projects/${data.project_id}`,
    });
  }

  revalidatePaths(data.project_id);
  return { reportId };
}

export async function uploadDocumentWithAutomation(data: {
  project_id: string;
  name: string;
  category: DocumentCategory;
  storage_path: string;
  file_name: string;
  file_size?: number;
  mime_type?: string;
  folder_id?: string;
  description?: string;
  event_date?: string;
  building?: string;
  floor?: string;
}): Promise<UploadResult> {
  const validation = createDocumentSchema.safeParse(data);
  if (!validation.success) {
    throw new Error(validation.error.errors[0]?.message ?? "Invalid document data");
  }

  const documentId = await createDocument({
    ...validation.data,
    folder_id: validation.data.folder_id ?? undefined,
    building: validation.data.building ?? undefined,
    floor: validation.data.floor ?? undefined,
    skipClientNotify: true,
  });

  const eventDate = data.event_date ?? new Date().toISOString().split("T")[0];

  const eventId = await createTimelineEvent({
    project_id: data.project_id,
    event_date: eventDate,
    title: `Document uploaded — ${data.name}`,
    progress_note: data.description ?? `${data.category.replace(/_/g, " ")} document added to project.`,
    building: data.building ?? null,
    floor: data.floor ?? null,
    skipClientNotify: true,
  });

  await logActivity(data.project_id, `Document uploaded: ${data.name}`, "document", documentId, {
    category: data.category,
  });

  if (await isNotificationRuleEnabled("onUpload")) {
    await notifyProjectClientUsers(data.project_id, {
      title: "New document uploaded",
      message: `${data.name} is now available in your project documents.`,
      type: "project_update",
      link: `/dashboard/projects/${data.project_id}`,
    });
  }

  revalidatePaths(data.project_id);
  return { documentId, eventId };
}

export async function uploadTimelineUpdateWithAutomation(data: {
  project_id: string;
  title: string;
  event_date: string;
  progress_note?: string;
  engineer?: string;
  building?: string;
  floor?: string;
  tour_id?: string;
  report_id?: string;
}): Promise<UploadResult> {
  const eventId = await createTimelineEvent({
    project_id: data.project_id,
    event_date: data.event_date,
    title: data.title,
    progress_note: data.progress_note,
    tour_id: data.tour_id,
    report_id: data.report_id,
    building: data.building ?? null,
    floor: data.floor ?? null,
  });

  await logActivity(
    data.project_id,
    `Timeline updated: ${data.title}`,
    "timeline_event",
    eventId,
    { building: data.building, floor: data.floor, engineer: data.engineer }
  );

  revalidatePaths(data.project_id);
  return { eventId };
}

export async function attachSitePhotosWithAutomation(data: {
  project_id: string;
  event_id: string;
  title: string;
  photos: Array<{ storage_path: string; file_name: string; caption?: string }>;
  building?: string;
  floor?: string;
}): Promise<UploadResult> {
  if (data.photos.length === 0) {
    throw new Error("Select at least one photo.");
  }

  await addTimelinePhotos(
    data.event_id,
    data.photos.map((photo) => ({
      storage_path: photo.storage_path,
      file_name: photo.file_name,
      caption: photo.caption,
    }))
  );

  await logActivity(
    data.project_id,
    `Site photos uploaded: ${data.title}`,
    "timeline_photo",
    data.event_id,
    { building: data.building, floor: data.floor, count: String(data.photos.length) }
  );

  revalidatePaths(data.project_id);
  return { eventId: data.event_id };
}

export async function uploadSitePhotosWithAutomation(data: {
  project_id: string;
  title: string;
  event_date: string;
  photos: Array<{ storage_path: string; file_name: string; caption?: string }>;
  progress_note?: string;
  building?: string;
  floor?: string;
}): Promise<UploadResult> {
  if (data.photos.length === 0) {
    throw new Error("Select at least one photo.");
  }

  const eventId = await createTimelineEvent({
    project_id: data.project_id,
    event_date: data.event_date,
    title: data.title,
    progress_note:
      data.progress_note ??
      `${data.photos.length} site photo${data.photos.length === 1 ? "" : "s"} uploaded via Upload Center.`,
  });

  await addTimelinePhotos(
    eventId,
    data.photos.map((photo) => ({
      storage_path: photo.storage_path,
      file_name: photo.file_name,
      caption: photo.caption,
    }))
  );

  await logActivity(
    data.project_id,
    `Site photos uploaded: ${data.title}`,
    "timeline_photo",
    eventId,
    { building: data.building, floor: data.floor, count: String(data.photos.length) }
  );

  revalidatePaths(data.project_id);
  return { eventId };
}

export async function uploadIssueWithAutomation(data: {
  project_id: string;
  title: string;
  description?: string;
  priority: string;
  location?: string;
  building?: string;
  floor?: string;
  event_date?: string;
  images?: Array<{
    storage_path: string;
    file_name: string;
    caption?: string;
    sort_order?: number;
  }>;
}): Promise<UploadResult> {
  const validation = createIssueSchema.safeParse({
    project_id: data.project_id,
    title: data.title,
    description: data.description,
    priority: data.priority,
    status: "open",
    location: data.location,
    building: data.building,
    floor: data.floor,
    images: data.images,
  });

  if (!validation.success) {
    throw new Error(validation.error.errors[0]?.message ?? "Invalid issue data");
  }

  const issueId = await createIssue({
    project_id: data.project_id,
    title: data.title,
    description: data.description,
    priority: data.priority,
    status: "open",
    location: data.location,
    building: data.building,
    floor: data.floor,
    images: data.images,
  });

  const eventDate = data.event_date ?? new Date().toISOString().split("T")[0];

  const eventId = await createTimelineEvent({
    project_id: data.project_id,
    event_date: eventDate,
    title: `Issue reported — ${data.title}`,
    progress_note: data.description ?? `New ${data.priority} priority issue logged.`,
    building: data.building ?? null,
    floor: data.floor ?? null,
    skipClientNotify: true,
  });

  await logActivity(data.project_id, `Issue reported: ${data.title}`, "issue", issueId, {
    priority: data.priority,
    location: data.location,
  });

  revalidatePaths(data.project_id);
  return { issueId, eventId };
}

function revalidatePaths(projectId: string) {
  revalidatePath("/admin");
  revalidatePath("/admin/upload");
  revalidatePath("/admin/tours");
  revalidatePath("/admin/timeline");
  revalidatePath("/admin/reports");
  revalidatePath("/admin/documents");
  revalidatePath("/admin/photos");
  revalidatePath("/admin/issues");
  revalidatePath("/admin/activity");
  revalidatePath(`/admin/projects/${projectId}`);
  revalidatePath(`/dashboard/projects/${projectId}`);
}
