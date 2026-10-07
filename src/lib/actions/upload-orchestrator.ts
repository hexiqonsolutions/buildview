"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { normalizeMatterportUrl, resolveMatterportThumbnailUrl } from "@/lib/matterport";
import { createTourSchema } from "@/lib/validations/tour";
import { createReportSchema } from "@/lib/validations/report";
import { createDocumentSchema } from "@/lib/validations/document";
import { createIssueSchema } from "@/lib/validations/issue";
import { validate } from "@/lib/validations/parse";
import {
  attachSitePhotosSchema,
  beginInvoiceUploadSchema,
  finalizeInvoiceUploadSchema,
  uploadDocumentSchema,
  uploadIssueSchema,
  uploadMatterportSchema,
  uploadReportSchema,
  uploadSitePhotosSchema,
  uploadTimelineUpdateSchema,
} from "@/lib/validations/upload";
import { createTimelineEvent } from "@/lib/actions/timeline";
import { recordTimelineEntry } from "@/lib/timeline/auto-entry";
import { DEFAULT_CURRENCY } from "@/lib/currency";
import type {
  ActivityLogInsert,
  DocumentCategory,
  ProjectTourInsert,
  ReportType,
} from "@/lib/types";
import { createReport, createDocument, createInvoice, attachInvoicePdf } from "@/lib/actions/admin";
import { addTimelinePhotos } from "@/lib/actions/timeline";
import { createIssue } from "@/lib/actions/issues";
import {
  getProjectNameForNotify,
  isNotificationRuleEnabled,
  notifyProjectClientUsers,
} from "@/lib/notifications/server";
import { resolveSpatialForWrite } from "@/lib/admin/spatial-resolve";
import { buildTourDescription } from "@/lib/admin/tour-metadata";
import {
  formatUploadNotifyMessage,
  portalDocumentLink,
  portalInvoiceLink,
  portalIssuesLink,
  portalMatterportLink,
  portalPhotosLink,
  portalReportLink,
  portalTimelineLink,
} from "@/lib/portal/notification-links";
import { assertCanUploadToProject } from "@/lib/auth/upload-access";
import { isBuildViewStaffRole } from "@/lib/auth/roles";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { PublicError } from "@/lib/errors/public";
import { internalError } from "@/lib/errors/server";

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
  /** Set when the input was rejected; thrown errors are masked in production, returned ones are not. */
  error?: string;
  tourId?: string;
  reportId?: string;
  documentId?: string;
  invoiceId?: string;
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

  const { error } = await supabase.from("activity_logs").insert(payload);
  if (error) {
    const admin = createServiceRoleClient();
    await admin.from("activity_logs").insert(payload);
  }
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
  const parsedInput = validate(uploadMatterportSchema, data);
  if (!parsedInput.success) return { error: parsedInput.error };
  const input = parsedInput.data;
  await assertCanUploadToProject(input.project_id, "matterport");
  const supabase = await createClient();

  const spatial = await resolveSpatialForWrite(supabase, input.project_id, {
    building: input.building,
    floor: input.floor,
    building_id: input.building_id,
    floor_id: input.floor_id,
  });

  const parsed = createTourSchema.safeParse({
    project_id: input.project_id,
    name: input.name,
    matterport_url: input.matterport_url,
    capture_date: input.capture_date,
    description: buildTourDescription({
      building: spatial.building ?? undefined,
      floor: spatial.floor ?? undefined,
      building_id: spatial.building_id,
      floor_id: spatial.floor_id,
      engineer: input.engineer,
      notes: input.progress_note,
    }),
  });

  if (!parsed.success) {
    throw new PublicError(parsed.error.errors[0]?.message ?? "Invalid tour data");
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const normalizedUrl = normalizeMatterportUrl(parsed.data.matterport_url);

  const payload: ProjectTourInsert = {
    project_id: parsed.data.project_id,
    name: parsed.data.name,
    matterport_url: normalizedUrl,
    thumbnail_url: await resolveMatterportThumbnailUrl(normalizedUrl),
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

  if (error || !tour) throw internalError("uploadMatterportWithAutomation", error);

  await recordTimelineEntry(
    {
      project_id: parsed.data.project_id,
      event_date: parsed.data.capture_date,
      title: `Virtual tour scan — ${parsed.data.name}`,
      progress_note:
        input.progress_note ??
        `New virtual tour uploaded${spatial.building ? ` for ${spatial.building}` : ""}${spatial.floor ? ` · ${spatial.floor}` : ""}.`,
      tour_id: tour.id,
      building: spatial.building,
      floor: spatial.floor,
    },
    "uploadMatterportWithAutomation"
  );

  await logActivity(
    parsed.data.project_id,
    `Virtual tour uploaded: ${parsed.data.name}`,
    "project_tour",
    tour.id,
    {
      building: spatial.building ?? undefined,
      floor: spatial.floor ?? undefined,
      building_id: spatial.building_id ?? undefined,
      floor_id: spatial.floor_id ?? undefined,
    }
  );

  try {
    if (await isNotificationRuleEnabled("onUpload")) {
      const projectName = await getProjectNameForNotify(parsed.data.project_id);
      await notifyProjectClientUsers(parsed.data.project_id, {
        title: "New virtual tour scan available",
        message: formatUploadNotifyMessage(parsed.data.name, projectName, "project"),
        type: "project_update",
        link: portalMatterportLink(parsed.data.project_id, tour.id),
      });
    }
  } catch (err) {
    console.error("[uploadMatterportWithAutomation] notify failed:", err);
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
  const parsedInput = validate(uploadReportSchema, data);
  if (!parsedInput.success) return { error: parsedInput.error };
  const input = parsedInput.data;
  await assertCanUploadToProject(input.project_id, "reports");
  const validation = createReportSchema.safeParse(input);
  if (!validation.success) {
    throw new PublicError(validation.error.errors[0]?.message ?? "Invalid report data");
  }

  const reportId = await createReport({
    ...validation.data,
    building: validation.data.building ?? undefined,
    floor: validation.data.floor ?? undefined,
    skipClientNotify: true,
    skipTimeline: true,
  });

  await recordTimelineEntry(
    {
      project_id: input.project_id,
      event_date: input.report_date,
      title: `Report uploaded — ${input.title}`,
      progress_note: input.description ?? `New ${input.report_type.replace(/_/g, " ")} added to project.`,
      report_id: reportId,
      building: input.building ?? null,
      floor: input.floor ?? null,
    },
    "uploadReportWithAutomation"
  );

  try {
    await logActivity(input.project_id, `Report uploaded: ${input.title}`, "report", reportId);
  } catch (err) {
    console.error("[uploadReportWithAutomation] activity log failed:", err);
  }

  try {
    if (await isNotificationRuleEnabled("onUpload")) {
      const projectName = await getProjectNameForNotify(input.project_id);
      await notifyProjectClientUsers(input.project_id, {
        title: "New report uploaded",
        message: formatUploadNotifyMessage(input.title, projectName, "Reports"),
        type: "project_update",
        link: portalReportLink(input.project_id, reportId),
      });
    }
  } catch (err) {
    console.error("[uploadReportWithAutomation] notify failed:", err);
  }

  revalidatePaths(input.project_id);
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
  const parsedInput = validate(uploadDocumentSchema, data);
  if (!parsedInput.success) return { error: parsedInput.error };
  const { event_date: eventDate, ...input } = parsedInput.data;
  await assertCanUploadToProject(input.project_id, "documents");
  const validation = createDocumentSchema.safeParse(input);
  if (!validation.success) {
    throw new PublicError(validation.error.errors[0]?.message ?? "Invalid document data");
  }

  const documentId = await createDocument({
    ...validation.data,
    folder_id: validation.data.folder_id ?? undefined,
    building: validation.data.building ?? undefined,
    floor: validation.data.floor ?? undefined,
    skipClientNotify: true,
    skipTimeline: true,
  });

  const eventId = await recordTimelineEntry(
    {
      project_id: input.project_id,
      event_date: eventDate,
      title: `Document uploaded — ${input.name}`,
      progress_note: input.description ?? `${input.category.replace(/_/g, " ")} document added to project.`,
      building: input.building ?? null,
      floor: input.floor ?? null,
    },
    "uploadDocumentWithAutomation"
  );

  await logActivity(input.project_id, `Document uploaded: ${input.name}`, "document", documentId, {
    category: input.category,
  });

  try {
    if (await isNotificationRuleEnabled("onUpload")) {
      const projectName = await getProjectNameForNotify(input.project_id);
      await notifyProjectClientUsers(input.project_id, {
        title: "New document uploaded",
        message: formatUploadNotifyMessage(input.name, projectName, "Documents"),
        type: "project_update",
        link: portalDocumentLink(input.project_id, documentId),
      });
    }
  } catch (err) {
    console.error("[uploadDocumentWithAutomation] notify failed:", err);
  }

  revalidatePaths(input.project_id);
  return { documentId, eventId };
}

/** Create invoice row first so the client can upload the PDF to the invoice path. */
export async function beginInvoiceUploadWithAutomation(data: {
  project_id: string;
  client_id: string;
  invoice_number: string;
  amount?: number;
  currency?: string;
  description?: string;
}): Promise<{ invoiceId: string } | { error: string }> {
  const parsedInput = validate(beginInvoiceUploadSchema, data);
  if (!parsedInput.success) return { error: parsedInput.error };
  const input = parsedInput.data;
  const auth = await assertCanUploadToProject(input.project_id, "invoices");
  if (!isBuildViewStaffRole(auth.role)) {
    throw new PublicError("Only BuildView staff can upload invoices");
  }

  const invoiceId = await createInvoice({
    client_id: input.client_id,
    project_id: input.project_id,
    invoice_number: input.invoice_number,
    amount: input.amount ?? 0,
    currency: DEFAULT_CURRENCY,
    status: "sent",
    description: input.description,
  });

  return { invoiceId };
}

/** Attach PDF, timeline, activity, and notify clients → Invoices tab. */
export async function finalizeInvoiceUploadWithAutomation(data: {
  invoice_id: string;
  project_id: string;
  invoice_number: string;
  storage_path: string;
  description?: string;
  event_date?: string;
}): Promise<UploadResult> {
  const parsedInput = validate(finalizeInvoiceUploadSchema, data);
  if (!parsedInput.success) return { error: parsedInput.error };
  const input = parsedInput.data;
  const auth = await assertCanUploadToProject(input.project_id, "invoices");
  if (!isBuildViewStaffRole(auth.role)) {
    throw new PublicError("Only BuildView staff can upload invoices");
  }
  await attachInvoicePdf(input.invoice_id, { storage_path: input.storage_path });

  await recordTimelineEntry(
    {
      project_id: input.project_id,
      event_date: input.event_date,
      title: `Invoice uploaded — ${input.invoice_number}`,
      progress_note: input.description ?? "Invoice PDF added to project billing.",
    },
    "finalizeInvoiceUploadWithAutomation"
  );

  try {
    await logActivity(
      input.project_id,
      `Invoice uploaded: ${input.invoice_number}`,
      "invoice",
      input.invoice_id
    );
  } catch (err) {
    console.error("[finalizeInvoiceUploadWithAutomation] activity log failed:", err);
  }

  try {
    if (await isNotificationRuleEnabled("onUpload")) {
      const projectName = await getProjectNameForNotify(input.project_id);
      await notifyProjectClientUsers(input.project_id, {
        title: "New invoice available",
        message: formatUploadNotifyMessage(
          `Invoice ${input.invoice_number}`,
          projectName,
          "Invoices"
        ),
        type: "invoice_update",
        link: portalInvoiceLink(input.project_id, input.invoice_id),
      });
    }
  } catch (err) {
    console.error("[finalizeInvoiceUploadWithAutomation] notify failed:", err);
  }

  revalidatePaths(input.project_id);
  revalidatePath("/admin/invoices");
  revalidatePath("/dashboard/invoices");
  return { invoiceId: input.invoice_id };
}

export async function uploadTimelineUpdateWithAutomation(data: {
  project_id: string;
  title: string;
  event_date: string;
  progress_note?: string;
  progress_percent?: number;
  engineer?: string;
  building?: string;
  floor?: string;
  tour_id?: string;
  report_id?: string;
  /** When true, skip onUpload notify (e.g. prelude to site-photo attach). */
  skipClientNotify?: boolean;
}): Promise<UploadResult> {
  const parsedInput = validate(uploadTimelineUpdateSchema, data);
  if (!parsedInput.success) return { error: parsedInput.error };
  const input = parsedInput.data;
  await assertCanUploadToProject(input.project_id, "upload");
  const eventId = await createTimelineEvent({
    project_id: input.project_id,
    event_date: input.event_date,
    title: input.title,
    progress_note: input.progress_note,
    progress_percent: input.progress_percent ?? null,
    tour_id: input.tour_id,
    report_id: input.report_id,
    building: input.building ?? null,
    floor: input.floor ?? null,
    skipClientNotify: true,
  });

  await logActivity(
    input.project_id,
    `Timeline updated: ${input.title}`,
    "timeline_event",
    eventId,
    { building: input.building, floor: input.floor, engineer: input.engineer }
  );

  if (!input.skipClientNotify) {
    try {
      if (await isNotificationRuleEnabled("onUpload")) {
        const projectName = await getProjectNameForNotify(input.project_id);
        await notifyProjectClientUsers(input.project_id, {
          title: "Timeline updated",
          message: formatUploadNotifyMessage(input.title, projectName, "Timeline"),
          type: "project_update",
          link: portalTimelineLink(input.project_id),
        });
      }
    } catch (err) {
      console.error("[uploadTimelineUpdateWithAutomation] notify failed:", err);
    }
  }

  revalidatePaths(input.project_id);
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
  const parsedInput = validate(attachSitePhotosSchema, data);
  if (!parsedInput.success) return { error: parsedInput.error };
  const input = parsedInput.data;
  await assertCanUploadToProject(input.project_id, "upload");

  await addTimelinePhotos(
    input.event_id,
    input.photos.map((photo) => ({
      storage_path: photo.storage_path,
      file_name: photo.file_name,
      caption: photo.caption,
    }))
  );

  await logActivity(
    input.project_id,
    `Site photos uploaded: ${input.title}`,
    "timeline_photo",
    input.event_id,
    { building: input.building, floor: input.floor, count: String(input.photos.length) }
  );

  try {
    if (await isNotificationRuleEnabled("onUpload")) {
      const projectName = await getProjectNameForNotify(input.project_id);
      await notifyProjectClientUsers(input.project_id, {
        title: "New site photos uploaded",
        message: formatUploadNotifyMessage(
          `${input.title} (${input.photos.length} photo${input.photos.length === 1 ? "" : "s"})`,
          projectName,
          "Site Photos"
        ),
        type: "project_update",
        link: portalPhotosLink(input.project_id),
      });
    }
  } catch (err) {
    console.error("[attachSitePhotosWithAutomation] notify failed:", err);
  }

  revalidatePaths(input.project_id);
  return { eventId: input.event_id };
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
  const parsedInput = validate(uploadSitePhotosSchema, data);
  if (!parsedInput.success) return { error: parsedInput.error };
  const input = parsedInput.data;
  await assertCanUploadToProject(input.project_id, "upload");

  const eventId = await createTimelineEvent({
    project_id: input.project_id,
    event_date: input.event_date,
    title: input.title,
    progress_note:
      input.progress_note ??
      `${input.photos.length} site photo${input.photos.length === 1 ? "" : "s"} uploaded via Upload Center.`,
  });

  await addTimelinePhotos(
    eventId,
    input.photos.map((photo) => ({
      storage_path: photo.storage_path,
      file_name: photo.file_name,
      caption: photo.caption,
    }))
  );

  await logActivity(
    input.project_id,
    `Site photos uploaded: ${input.title}`,
    "timeline_photo",
    eventId,
    { building: input.building, floor: input.floor, count: String(input.photos.length) }
  );

  revalidatePaths(input.project_id);
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
  const parsedInput = validate(uploadIssueSchema, data);
  if (!parsedInput.success) return { error: parsedInput.error };
  const input = parsedInput.data;
  await assertCanUploadToProject(input.project_id, "issues");
  const validation = createIssueSchema.safeParse({
    project_id: input.project_id,
    title: input.title,
    description: input.description,
    priority: input.priority,
    status: "open",
    location: input.location,
    building: input.building,
    floor: input.floor,
  });

  if (!validation.success) {
    throw new PublicError(validation.error.errors[0]?.message ?? "Invalid issue data");
  }

  const issueId = await createIssue({
    project_id: input.project_id,
    title: input.title,
    description: input.description,
    priority: input.priority,
    status: "open",
    location: input.location,
    building: input.building,
    floor: input.floor,
    images: input.images,
    skipClientNotify: true,
    skipTimeline: true,
  });

  const eventId = await recordTimelineEntry(
    {
      project_id: input.project_id,
      event_date: input.event_date,
      title: `Issue reported — ${input.title}`,
      progress_note: input.description ?? `New ${input.priority} priority issue logged.`,
      building: input.building ?? null,
      floor: input.floor ?? null,
    },
    "uploadIssueWithAutomation"
  );

  try {
    await logActivity(input.project_id, `Issue reported: ${input.title}`, "issue", issueId, {
      priority: input.priority,
      location: input.location,
    });
  } catch (err) {
    console.error("[uploadIssueWithAutomation] activity log failed:", err);
  }

  // Notify clients on upload (same path as reports/documents) so Issues reach the portal inbox.
  try {
    if (await isNotificationRuleEnabled("onUpload")) {
      const projectName = await getProjectNameForNotify(input.project_id);
      await notifyProjectClientUsers(input.project_id, {
        title: "New issue reported",
        message: formatUploadNotifyMessage(input.title, projectName, "Issues"),
        type: "issue_update",
        link: portalIssuesLink(input.project_id, issueId),
      });
    }
  } catch (err) {
    console.error("[uploadIssueWithAutomation] notify failed:", err);
  }

  revalidatePaths(input.project_id);
  return { issueId, eventId };
}

function revalidatePaths(projectId: string) {
  // Avoid revalidating /admin/upload — refreshing the wizard mid-flow surfaces opaque RSC errors.
  revalidatePath("/admin/tours");
  revalidatePath("/admin/timeline");
  revalidatePath("/admin/reports");
  revalidatePath("/admin/documents");
  revalidatePath("/admin/photos");
  revalidatePath("/admin/issues");
  revalidatePath("/admin/activity");
  revalidatePath(`/admin/projects/${projectId}`);
  revalidatePath(`/dashboard/projects/${projectId}`);
  revalidatePath("/dashboard/reports");
  revalidatePath("/dashboard/documents");
  revalidatePath("/dashboard/invoices");
  revalidatePath("/dashboard/timeline");
  revalidatePath("/dashboard/issues");
}
