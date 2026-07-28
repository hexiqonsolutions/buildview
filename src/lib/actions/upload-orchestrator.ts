"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { normalizeMatterportUrl } from "@/lib/matterport";
import { createTourSchema } from "@/lib/validations/tour";
import { createReportSchema } from "@/lib/validations/report";
import { createDocumentSchema } from "@/lib/validations/document";
import { createIssueSchema } from "@/lib/validations/issue";
import { createTimelineEvent } from "@/lib/actions/timeline";
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
import { notifyProjectClientUsers, getProjectNameForNotify } from "@/lib/actions/notifications";
import { isNotificationRuleEnabled } from "@/lib/actions/platform-settings";
import { resolveSpatialForWrite } from "@/lib/admin/spatial-resolve";
import { buildTourDescription } from "@/lib/admin/tour-metadata";
import {
  formatUploadNotifyMessage,
  portalDocumentLink,
  portalInvoiceLink,
  portalIssuesLink,
  portalMatterportLink,
  portalReportLink,
  portalTimelineLink,
} from "@/lib/portal/notification-links";
import { assertCanUploadToProject } from "@/lib/auth/upload-access";
import { isBuildViewStaffRole } from "@/lib/auth/roles";

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
  await assertCanUploadToProject(data.project_id, "matterport");
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

  try {
    if (await isNotificationRuleEnabled("onUpload")) {
      const projectName = await getProjectNameForNotify(parsed.data.project_id);
      await notifyProjectClientUsers(parsed.data.project_id, {
        title: "New Matterport scan available",
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
  await assertCanUploadToProject(data.project_id, "reports");
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

  try {
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
  } catch (err) {
    console.error("[uploadReportWithAutomation] timeline failed:", err);
  }

  try {
    await logActivity(data.project_id, `Report uploaded: ${data.title}`, "report", reportId);
  } catch (err) {
    console.error("[uploadReportWithAutomation] activity log failed:", err);
  }

  try {
    if (await isNotificationRuleEnabled("onUpload")) {
      const projectName = await getProjectNameForNotify(data.project_id);
      await notifyProjectClientUsers(data.project_id, {
        title: "New report uploaded",
        message: formatUploadNotifyMessage(data.title, projectName, "Reports"),
        type: "project_update",
        link: portalReportLink(data.project_id, reportId),
      });
    }
  } catch (err) {
    console.error("[uploadReportWithAutomation] notify failed:", err);
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
  await assertCanUploadToProject(data.project_id, "documents");
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

  try {
    if (await isNotificationRuleEnabled("onUpload")) {
      const projectName = await getProjectNameForNotify(data.project_id);
      await notifyProjectClientUsers(data.project_id, {
        title: "New document uploaded",
        message: formatUploadNotifyMessage(data.name, projectName, "Documents"),
        type: "project_update",
        link: portalDocumentLink(data.project_id, documentId),
      });
    }
  } catch (err) {
    console.error("[uploadDocumentWithAutomation] notify failed:", err);
  }

  revalidatePaths(data.project_id);
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
}): Promise<{ invoiceId: string }> {
  const auth = await assertCanUploadToProject(data.project_id, "invoices");
  if (!isBuildViewStaffRole(auth.role)) {
    throw new Error("Only BuildView staff can upload invoices");
  }
  const invoiceNumber = data.invoice_number.trim();
  if (!invoiceNumber) throw new Error("Invoice number is required.");
  if (!data.client_id) throw new Error("Client is required for invoice upload.");

  const invoiceId = await createInvoice({
    client_id: data.client_id,
    project_id: data.project_id,
    invoice_number: invoiceNumber,
    amount: data.amount ?? 0,
    currency: data.currency ?? DEFAULT_CURRENCY,
    status: "sent",
    description: data.description,
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
  const auth = await assertCanUploadToProject(data.project_id, "invoices");
  if (!isBuildViewStaffRole(auth.role)) {
    throw new Error("Only BuildView staff can upload invoices");
  }
  await attachInvoicePdf(data.invoice_id, { storage_path: data.storage_path });

  const eventDate = data.event_date ?? new Date().toISOString().split("T")[0];

  try {
    await createTimelineEvent({
      project_id: data.project_id,
      event_date: eventDate,
      title: `Invoice uploaded — ${data.invoice_number}`,
      progress_note: data.description ?? "Invoice PDF added to project billing.",
      skipClientNotify: true,
    });
  } catch (err) {
    console.error("[finalizeInvoiceUploadWithAutomation] timeline failed:", err);
  }

  try {
    await logActivity(
      data.project_id,
      `Invoice uploaded: ${data.invoice_number}`,
      "invoice",
      data.invoice_id
    );
  } catch (err) {
    console.error("[finalizeInvoiceUploadWithAutomation] activity log failed:", err);
  }

  try {
    if (await isNotificationRuleEnabled("onUpload")) {
      const projectName = await getProjectNameForNotify(data.project_id);
      await notifyProjectClientUsers(data.project_id, {
        title: "New invoice available",
        message: formatUploadNotifyMessage(
          `Invoice ${data.invoice_number}`,
          projectName,
          "Invoices"
        ),
        type: "invoice_update",
        link: portalInvoiceLink(data.project_id, data.invoice_id),
      });
    }
  } catch (err) {
    console.error("[finalizeInvoiceUploadWithAutomation] notify failed:", err);
  }

  revalidatePaths(data.project_id);
  revalidatePath("/admin/invoices");
  revalidatePath("/dashboard/invoices");
  return { invoiceId: data.invoice_id };
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
  await assertCanUploadToProject(data.project_id, "upload");
  const eventId = await createTimelineEvent({
    project_id: data.project_id,
    event_date: data.event_date,
    title: data.title,
    progress_note: data.progress_note,
    tour_id: data.tour_id,
    report_id: data.report_id,
    building: data.building ?? null,
    floor: data.floor ?? null,
    skipClientNotify: true,
  });

  await logActivity(
    data.project_id,
    `Timeline updated: ${data.title}`,
    "timeline_event",
    eventId,
    { building: data.building, floor: data.floor, engineer: data.engineer }
  );

  try {
    if (await isNotificationRuleEnabled("onUpload")) {
      const projectName = await getProjectNameForNotify(data.project_id);
      await notifyProjectClientUsers(data.project_id, {
        title: "Timeline updated",
        message: formatUploadNotifyMessage(data.title, projectName, "Timeline"),
        type: "project_update",
        link: portalTimelineLink(data.project_id),
      });
    }
  } catch (err) {
    console.error("[uploadTimelineUpdateWithAutomation] notify failed:", err);
  }

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
  await assertCanUploadToProject(data.project_id, "upload");
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

  try {
    if (await isNotificationRuleEnabled("onUpload")) {
      const projectName = await getProjectNameForNotify(data.project_id);
      await notifyProjectClientUsers(data.project_id, {
        title: "New site photos uploaded",
        message: formatUploadNotifyMessage(
          `${data.title} (${data.photos.length} photo${data.photos.length === 1 ? "" : "s"})`,
          projectName,
          "Timeline"
        ),
        type: "project_update",
        link: portalTimelineLink(data.project_id),
      });
    }
  } catch (err) {
    console.error("[attachSitePhotosWithAutomation] notify failed:", err);
  }

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
  await assertCanUploadToProject(data.project_id, "upload");
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
  await assertCanUploadToProject(data.project_id, "issues");
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
    skipClientNotify: true,
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

  try {
    await logActivity(data.project_id, `Issue reported: ${data.title}`, "issue", issueId, {
      priority: data.priority,
      location: data.location,
    });
  } catch (err) {
    console.error("[uploadIssueWithAutomation] activity log failed:", err);
  }

  // Notify clients on upload (same path as reports/documents) so Issues reach the portal inbox.
  try {
    if (await isNotificationRuleEnabled("onUpload")) {
      const projectName = await getProjectNameForNotify(data.project_id);
      await notifyProjectClientUsers(data.project_id, {
        title: "New issue reported",
        message: formatUploadNotifyMessage(data.title, projectName, "Issues"),
        type: "issue_update",
        link: portalIssuesLink(data.project_id, issueId),
      });
    }
  } catch (err) {
    console.error("[uploadIssueWithAutomation] notify failed:", err);
  }

  revalidatePaths(data.project_id);
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
