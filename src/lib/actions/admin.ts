"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { createSignedStorageUrl } from "@/lib/supabase/storage-server";
import { resolveInvoiceStoragePath } from "@/lib/supabase/storage";
import {
  getProjectNameForNotify,
  isNotificationRuleEnabled,
  notifyClientOrgIfEnabled,
  notifyClientsIfEnabled,
  notifyInvoiceRecipients,
  notifyUsersIfEnabled,
} from "@/lib/notifications/server";
import { requireStaffPermission } from "@/lib/auth/staff";
import { normalizeMatterportUrl, resolveMatterportThumbnailUrl } from "@/lib/matterport";
import { resolveSpatialForWrite } from "@/lib/admin/spatial-resolve";
import { buildTourDescription } from "@/lib/admin/tour-metadata";
import { createTourActionSchema } from "@/lib/validations/tour";
import { createReportActionSchema } from "@/lib/validations/report";
import {
  createDocumentActionSchema,
  createFolderSchema,
} from "@/lib/validations/document";
import { parseOrThrow, validate } from "@/lib/validations/parse";
import { uuid } from "@/lib/validations/primitives";
import type { z } from "zod";
import type {
  ClientDashboardType,
  ClientUpdate,
  DocumentFolderInsert,
  DocumentInsert,
  InvoiceInsert,
  InvoiceStatus,
  InvoiceUpdate,
  ProjectInsert,
  ProjectStatus,
  ProjectTourInsert,
  ProjectUpdate,
  ReportInsert,
  UserRole,
  UserUpdate,
} from "@/lib/types";
import {
  attachInvoicePdfSchema,
  createClientSchema,
  createInvoiceSchema,
  createProjectSchema,
  sendInvoiceNotificationSchema,
  updateClientSchema,
  updateInvoiceStatusSchema,
  updateProjectCoverImageSchema,
  updateProjectSchema,
  updateProjectStatusSchema,
  updateTourThumbnailSchema,
  updateUserSchema,
} from "@/lib/validations/admin";
import { isBuildViewStaffRole, isClientPortalRole, canAssignRoles } from "@/lib/auth/roles";
import { can } from "@/lib/auth/permissions";
import { isRlsOrPermissionError } from "@/lib/supabase/rls";
import { assertCanUploadToProject } from "@/lib/auth/upload-access";
import {
  portalDocumentLink,
  portalMatterportLink,
  portalReportLink,
  formatUploadNotifyMessage,
} from "@/lib/portal/notification-links";
import { recordTimelineEntry } from "@/lib/timeline/auto-entry";
import { DEFAULT_CURRENCY } from "@/lib/currency";
import { isProjectVisibleInClientPortal } from "@/lib/portal/project-visibility";
import {
  buildInvoiceNotificationPayload,
  type InvoiceNotificationKind,
} from "@/lib/portal/invoice-notifications";
import { PublicError } from "@/lib/errors/public";
import { internalError, logServerError, toPublicMessage } from "@/lib/errors/server";
import { publicObjectPath, UPLOAD_RULES, verifyStoredUpload } from "@/lib/uploads/verify";
import { STORAGE_BUCKETS } from "@/lib/types";

const CLIENT_EDITABLE_STATUSES: ProjectStatus[] = [
  "planning",
  "in_progress",
  "on_hold",
  "completed",
];

/** Update only project status — available to staff and client portal users with access. */
export async function updateProjectStatus(projectId: string, status: string) {
  const { status: nextStatus } = parseOrThrow(updateProjectStatusSchema, { projectId, status });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new PublicError("You must be signed in");

  const { data: me } = await supabase
    .from("users")
    .select("role, client_id")
    .eq("id", user.id)
    .maybeSingle();

  if (!me?.role || !can(me.role as UserRole, "update", "projects")) {
    throw new PublicError("You do not have permission to update project status.");
  }

  const role = me.role as UserRole;
  const isStaff = isBuildViewStaffRole(role);

  if (!isStaff && !CLIENT_EDITABLE_STATUSES.includes(nextStatus)) {
    throw new PublicError("Clients can only set Planning, In Progress, On Hold, or Completed.");
  }

  const admin = createServiceRoleClient();
  const { data: project, error: fetchError } = await admin
    .from("projects")
    .select("id, name, client_id, status, deleted_at")
    .eq("id", projectId)
    .is("deleted_at", null)
    .maybeSingle();

  if (fetchError || !project) throw new PublicError("Project not found");

  if (isClientPortalRole(role)) {
    if (!isProjectVisibleInClientPortal(project)) {
      throw new PublicError("This project is not available in your portal.");
    }

    let hasAccess = Boolean(me.client_id && project.client_id === me.client_id);
    if (!hasAccess) {
      const { data: assignment } = await admin
        .from("project_assignments")
        .select("id")
        .eq("project_id", projectId)
        .eq("user_id", user.id)
        .is("deleted_at", null)
        .maybeSingle();
      hasAccess = Boolean(assignment);
    }
    if (!hasAccess) {
      throw new PublicError("You do not have access to this project.");
    }
  }

  if (project.status === nextStatus) return;

  const { error } = await admin
    .from("projects")
    .update({
      status: nextStatus,
      updated_by: user.id,
    })
    .eq("id", projectId)
    .is("deleted_at", null);

  if (error) throw internalError("updateProjectStatus", error);

  revalidatePath("/admin/projects");
  revalidatePath("/dashboard/projects");
  revalidatePath(`/dashboard/projects/${projectId}`);
  revalidatePath(`/admin/projects/${projectId}`);
  revalidatePath("/dashboard");
  revalidatePath("/admin");
}

export async function createClientRecord(data: {
  name: string;
  company_name?: string | null;
  email: string;
  phone?: string | null;
  address?: string | null;
}) {
  const validated = parseOrThrow(createClientSchema, data);

  const { supabase } = await requireStaffPermission("create", "clients");
  const { error } = await supabase.from("clients").insert(validated);
  if (error) throw internalError("createClientRecord", error);
  revalidatePath("/admin/clients");
}

/** Assign every active user belonging to a client org onto a project. */
async function assignClientOrgUsersToProject(
  projectId: string,
  clientId: string,
  assignedBy: string | null
) {
  const admin = createServiceRoleClient();
  const { data: users } = await admin
    .from("users")
    .select("id")
    .eq("client_id", clientId)
    .eq("is_active", true)
    .is("deleted_at", null);

  for (const u of users || []) {
    const { data: existing } = await admin
      .from("project_assignments")
      .select("id, deleted_at")
      .eq("project_id", projectId)
      .eq("user_id", u.id)
      .maybeSingle();

    if (existing?.deleted_at) {
      await admin
        .from("project_assignments")
        .update({
          deleted_at: null,
          deleted_by: null,
          assigned_by: assignedBy,
          updated_by: assignedBy,
        })
        .eq("id", existing.id);
    } else if (!existing) {
      await admin.from("project_assignments").insert({
        project_id: projectId,
        user_id: u.id,
        assigned_by: assignedBy,
        created_by: assignedBy,
        updated_by: null,
      });
    }
  }
}

export async function createProject(data: {
  name: string;
  client_id: string;
  client_name: string;
  location: string;
  start_date?: string | null;
  completion_date?: string | null;
  status: string;
  description?: string | null;
  area_sqft?: number | null;
  portfolio_category?: "architecture" | "interior" | "real_estate" | null;
}): Promise<{ projectId: string } | { error: string }> {
  const validation = validate(createProjectSchema, data);
  if (!validation.success) return { error: validation.error };
  const validated = validation.data;
  const name = validated.name;

  let supabase: Awaited<ReturnType<typeof createClient>>;
  let user: { id: string };
  try {
    ({ supabase, user } = await requireStaffPermission("create", "projects"));
  } catch (err) {
    return { error: toPublicMessage("createProject", err, "Not allowed") };
  }

  const payload: ProjectInsert = {
    name,
    client_id: validated.client_id,
    client_name: validated.client_name,
    location: validated.location,
    status: validated.status,
    description: validated.description,
    start_date: validated.start_date,
    completion_date: validated.completion_date,
    area_sqft: validated.area_sqft,
    portfolio_category: validated.portfolio_category,
    created_by: user?.id ?? null,
  };

  const finish = async (projectId: string) => {
    try {
      await assignClientOrgUsersToProject(projectId, validated.client_id, user?.id ?? null);
    } catch {
      // Non-fatal: org-wide access still works after has_project_access SQL fix
    }
    try {
      await notifyClientOrgIfEnabled("onProjectAssigned", validated.client_id, {
        title: "New project available",
        message: `${name} has been added to your BuildView portal.`,
        type: "project_update",
        link: `/dashboard/projects/${projectId}`,
      });
    } catch (err) {
      console.error("[createProject] client notify failed:", err);
    }
    revalidatePath("/admin/projects");
    revalidatePath("/dashboard/projects");
    revalidatePath("/dashboard");
    return { projectId };
  };

  const { data: created, error } = await supabase.from("projects").insert(payload).select("id").single();
  if (error || !created) {
    const msg = (error?.message ?? "").toLowerCase();
    const missingPortfolioCols =
      (msg.includes("area_sqft") || msg.includes("portfolio_category")) &&
      (msg.includes("schema cache") || msg.includes("column") || msg.includes("could not find"));

    if (missingPortfolioCols) {
      const { area_sqft: _a, portfolio_category: _c, ...basePayload } = payload;
      const { data: retryCreated, error: retryError } = await supabase
        .from("projects")
        .insert(basePayload)
        .select("id")
        .single();
      if (retryError || !retryCreated) {
        return { error: toPublicMessage("createProject", retryError, "Failed to create project") };
      }
      return finish(retryCreated.id);
    }
    return { error: toPublicMessage("createProject", error, "Failed to create project") };
  }

  return finish(created.id);
}

/** Set or clear a project's cover thumbnail URL after upload. */
export async function updateProjectCoverImage(
  projectId: string,
  coverImageUrl: string | null
) {
  const validated = parseOrThrow(updateProjectCoverImageSchema, { projectId, coverImageUrl });

  const { supabase, user } = await requireStaffPermission("update", "projects");

  if (validated.coverImageUrl) {
    const path = publicObjectPath(validated.coverImageUrl, STORAGE_BUCKETS.PROJECT_COVERS);
    if (!path) throw new PublicError("Cover image must be uploaded to this project's cover folder");
    await verifyStoredUpload(UPLOAD_RULES.projectCover, path, "updateProjectCoverImage");
  }

  const { error } = await supabase
    .from("projects")
    .update({
      cover_image_url: validated.coverImageUrl,
      updated_by: user?.id ?? null,
    } satisfies ProjectUpdate)
    .eq("id", projectId)
    .is("deleted_at", null);

  if (error) throw internalError("updateProjectCoverImage", error);

  revalidatePath("/admin/projects");
  revalidatePath(`/admin/projects/${projectId}`);
  revalidatePath("/dashboard/projects");
  revalidatePath(`/dashboard/projects/${projectId}`);
  revalidatePath("/dashboard");
}

/** Set, replace, or clear a tour's thumbnail. */
export async function updateTourThumbnail(tourId: string, thumbnailUrl: string | null) {
  const validated = parseOrThrow(updateTourThumbnailSchema, { tourId, thumbnailUrl });

  const admin = createServiceRoleClient();
  const { data: tour, error: tourError } = await admin
    .from("project_tours")
    .select("id, project_id")
    .eq("id", tourId)
    .is("deleted_at", null)
    .maybeSingle();

  if (tourError) throw internalError("updateTourThumbnail", tourError);
  if (!tour) throw new PublicError("Tour not found.");

  await assertCanUploadToProject(tour.project_id, "matterport");

  if (validated.thumbnailUrl) {
    const path = publicObjectPath(validated.thumbnailUrl, STORAGE_BUCKETS.PROJECT_COVERS);
    if (!path?.startsWith(`${tour.project_id}/`)) {
      throw new PublicError("Thumbnail must be uploaded to this project's cover folder.");
    }
    await verifyStoredUpload(UPLOAD_RULES.projectCover, path, "updateTourThumbnail");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await admin
    .from("project_tours")
    .update({ thumbnail_url: validated.thumbnailUrl, updated_by: user?.id ?? null })
    .eq("id", tourId);

  if (error) throw internalError("updateTourThumbnail", error);

  revalidatePath("/admin/tours");
  revalidatePath(`/admin/projects/${tour.project_id}`);
  revalidatePath("/dashboard/projects");
  revalidatePath(`/dashboard/projects/${tour.project_id}`);
  revalidatePath("/dashboard");
}

export async function createTour(data: {
  project_id: string;
  name: string;
  matterport_url: string;
  capture_date?: string | null;
  description?: string | null;
  building?: string | null;
  floor?: string | null;
  building_id?: string | null;
  floor_id?: string | null;
}) {
  const validated = parseOrThrow(createTourActionSchema, data);

  await assertCanUploadToProject(validated.project_id, "matterport");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const normalizedUrl = normalizeMatterportUrl(validated.matterport_url);

  const spatial = await resolveSpatialForWrite(supabase, validated.project_id, {
    building: validated.building,
    floor: validated.floor,
    building_id: validated.building_id,
    floor_id: validated.floor_id,
  });

  const structuredDescription = buildTourDescription({
    building: spatial.building ?? undefined,
    floor: spatial.floor ?? undefined,
    building_id: spatial.building_id,
    floor_id: spatial.floor_id,
    notes: validated.description ?? undefined,
  });

  const payload: ProjectTourInsert = {
    project_id: validated.project_id,
    name: validated.name,
    matterport_url: normalizedUrl,
    thumbnail_url: await resolveMatterportThumbnailUrl(normalizedUrl),
    capture_date: validated.capture_date ?? null,
    description: structuredDescription ?? validated.description ?? null,
    building_id: spatial.building_id,
    floor_id: spatial.floor_id,
    created_by: user?.id ?? null,
  };

  let tourId: string;
  const { data: inserted, error } = await supabase
    .from("project_tours")
    .insert(payload)
    .select("id")
    .single();
  if (error || !inserted) {
    if (error && isRlsOrPermissionError(error.message)) {
      const admin = createServiceRoleClient();
      const { data: retryInserted, error: retryError } = await admin
        .from("project_tours")
        .insert(payload)
        .select("id")
        .single();
      if (retryError || !retryInserted) {
        throw internalError("createTour", retryError);
      }
      tourId = retryInserted.id;
    } else {
      throw internalError("createTour", error);
    }
  } else {
    tourId = inserted.id;
  }

  await recordTimelineEntry(
    {
      project_id: validated.project_id,
      event_date: validated.capture_date,
      title: `Virtual tour scan — ${validated.name}`,
      progress_note:
        validated.description ||
        `New virtual tour added${spatial.building ? ` for ${spatial.building}` : ""}${spatial.floor ? ` · ${spatial.floor}` : ""}.`,
      tour_id: tourId,
      building: spatial.building,
      floor: spatial.floor,
    },
    "createTour"
  );

  const projectName = await getProjectNameForNotify(validated.project_id);
  await notifyClientsIfEnabled("onUpload", validated.project_id, {
    title: "New virtual tour scan available",
    message: formatUploadNotifyMessage(validated.name, projectName, "project"),
    type: "project_update",
    link: portalMatterportLink(validated.project_id),
  });

  revalidatePath("/admin/tours");
  revalidatePath(`/admin/projects/${validated.project_id}`);
  revalidatePath(`/dashboard/projects/${validated.project_id}`);
  revalidatePath("/dashboard/projects");
  revalidatePath("/dashboard");
}

type CreateReportInput = {
  project_id: string;
  title: string;
  report_type: string;
  report_date: string;
  description?: string | null;
  storage_path: string;
  file_name: string;
  file_size?: number | null;
  mime_type?: string | null;
  building?: string | null;
  floor?: string | null;
  /** When true, caller already notifies clients (e.g. upload orchestrator). */
  skipClientNotify?: boolean;
  /** When true, caller creates its own timeline entry (e.g. upload orchestrator). */
  skipTimeline?: boolean;
};

type ValidatedReportInput = z.output<typeof createReportActionSchema>;

export async function createReport(input: CreateReportInput) {
  const data = parseOrThrow(createReportActionSchema, input);
  // insertReport may fall back to the service role, so authorize first.
  await assertCanUploadToProject(data.project_id, "reports");
  const stored = await verifyStoredUpload(UPLOAD_RULES.report, data.storage_path, "createReport");
  const reportId = await insertReport({ ...data, file_size: stored.size, mime_type: "application/pdf" });

  if (!data.skipTimeline) {
    await recordTimelineEntry(
      {
        project_id: data.project_id,
        event_date: data.report_date,
        title: `Report uploaded — ${data.title}`,
        progress_note:
          data.description || `New ${data.report_type.replace(/_/g, " ")} added to project.`,
        report_id: reportId,
        building: data.building ?? null,
        floor: data.floor ?? null,
      },
      "createReport"
    );
  }

  return reportId;
}

async function insertReport(validated: ValidatedReportInput) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const spatial = await resolveSpatialForWrite(supabase, validated.project_id, {
    building: validated.building,
    floor: validated.floor,
  });

  const payload: ReportInsert = {
    project_id: validated.project_id,
    title: validated.title,
    report_type: validated.report_type,
    report_date: validated.report_date,
    description: validated.description ?? null,
    storage_path: validated.storage_path,
    file_url: validated.storage_path,
    file_name: validated.file_name,
    file_size: validated.file_size ?? null,
    mime_type: validated.mime_type ?? "application/pdf",
    building: spatial.building,
    floor: spatial.floor,
    building_id: spatial.building_id,
    floor_id: spatial.floor_id,
    created_by: user?.id ?? null,
  };

  const { data: report, error } = await supabase
    .from("reports")
    .insert(payload)
    .select("id")
    .single();

  if (error || !report) {
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
      const { data: retryReport, error: retryError } = await supabase
        .from("reports")
        .insert(basePayload)
        .select("id")
        .single();
      if (retryError || !retryReport) {
        throw internalError("insertReport", retryError);
      }

      if (!validated.skipClientNotify) {
        const projectName = await getProjectNameForNotify(validated.project_id);
        await notifyClientsIfEnabled("onUpload", validated.project_id, {
          title: "New report uploaded",
          message: formatUploadNotifyMessage(validated.title, projectName, "Reports"),
          type: "project_update",
          link: portalReportLink(validated.project_id, retryReport.id),
        });
      }

      revalidatePath("/admin/reports");
      revalidatePath("/dashboard/reports");
      revalidatePath(`/dashboard/projects/${validated.project_id}`);
      return retryReport.id;
    }

    if (error && isRlsOrPermissionError(error.message)) {
      const admin = createServiceRoleClient();
      let { data: retryReport, error: retryError } = await admin
        .from("reports")
        .insert(payload)
        .select("id")
        .single();

      if (retryError) {
        const retryMsg = retryError.message.toLowerCase();
        const missingOnRetry =
          (retryMsg.includes("building") || retryMsg.includes("floor") || retryMsg.includes("schema cache")) &&
          (retryMsg.includes("column") || retryMsg.includes("could not find") || retryMsg.includes("schema cache"));

        if (missingOnRetry) {
          const {
            building: _b,
            floor: _f,
            building_id: _bi,
            floor_id: _fi,
            ...basePayload
          } = payload;
          ({ data: retryReport, error: retryError } = await admin
            .from("reports")
            .insert(basePayload)
            .select("id")
            .single());
        }
      }

      if (retryError || !retryReport) {
        throw internalError("insertReport", retryError);
      }

      if (!validated.skipClientNotify) {
        const projectName = await getProjectNameForNotify(validated.project_id);
        await notifyClientsIfEnabled("onUpload", validated.project_id, {
          title: "New report uploaded",
          message: formatUploadNotifyMessage(validated.title, projectName, "Reports"),
          type: "project_update",
          link: portalReportLink(validated.project_id, retryReport.id),
        });
      }

      revalidatePath("/admin/reports");
      revalidatePath("/dashboard/reports");
      revalidatePath(`/dashboard/projects/${validated.project_id}`);
      return retryReport.id;
    }

    throw internalError("insertReport", error);
  }

  if (!validated.skipClientNotify) {
    const projectName = await getProjectNameForNotify(validated.project_id);
    await notifyClientsIfEnabled("onUpload", validated.project_id, {
      title: "New report uploaded",
      message: formatUploadNotifyMessage(validated.title, projectName, "Reports"),
      type: "project_update",
      link: portalReportLink(validated.project_id, report.id),
    });
  }

  revalidatePath("/admin/reports");
  revalidatePath("/dashboard/reports");
  revalidatePath(`/dashboard/projects/${validated.project_id}`);
  return report.id;
}

export async function createDocumentFolder(data: {
  project_id: string;
  name: string;
  parent_id?: string | null;
}) {
  const validated = parseOrThrow(createFolderSchema, data);
  await assertCanUploadToProject(validated.project_id, "documents");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const payload: DocumentFolderInsert = {
    project_id: validated.project_id,
    name: validated.name,
    parent_id: validated.parent_id ?? null,
    sort_order: 0,
    created_by: user?.id ?? null,
    updated_by: user?.id ?? null,
  };

  const { error } = await supabase.from("document_folders").insert(payload);

  if (error) throw internalError("createDocumentFolder", error);

  revalidatePath("/admin/documents");
  revalidatePath(`/dashboard/projects/${validated.project_id}`);
  revalidatePath("/dashboard/documents");
}

type CreateDocumentInput = {
  project_id: string;
  name: string;
  category: string;
  storage_path: string;
  file_name: string;
  file_size?: number | null;
  mime_type?: string | null;
  folder_id?: string | null;
  description?: string | null;
  building?: string | null;
  floor?: string | null;
  /** When true, caller already notifies clients (e.g. upload orchestrator). */
  skipClientNotify?: boolean;
  /** When true, caller creates its own timeline entry (e.g. upload orchestrator). */
  skipTimeline?: boolean;
};

type ValidatedDocumentInput = z.output<typeof createDocumentActionSchema>;

export async function createDocument(input: CreateDocumentInput) {
  const data = parseOrThrow(createDocumentActionSchema, input);
  // insertDocument may fall back to the service role, so authorize first.
  await assertCanUploadToProject(data.project_id, "documents");
  const stored = await verifyStoredUpload(UPLOAD_RULES.document, data.storage_path, "createDocument");
  const documentId = await insertDocument({ ...data, file_size: stored.size, mime_type: stored.mimeType });

  if (!data.skipTimeline) {
    await recordTimelineEntry(
      {
        project_id: data.project_id,
        title: `Document uploaded — ${data.name}`,
        progress_note:
          data.description || `${data.category.replace(/_/g, " ")} document added to project.`,
        building: data.building ?? null,
        floor: data.floor ?? null,
      },
      "createDocument"
    );
  }

  return documentId;
}

async function insertDocument(validated: ValidatedDocumentInput) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const documentId = randomUUID();

    const spatial = await resolveSpatialForWrite(supabase, validated.project_id, {
      building: validated.building,
      floor: validated.floor,
    });

    const fullPayload: DocumentInsert = {
      id: documentId,
      project_id: validated.project_id,
      name: validated.name,
      category: validated.category,
      storage_path: validated.storage_path,
      file_url: validated.storage_path,
      file_name: validated.file_name,
      file_size: validated.file_size ?? null,
      mime_type: validated.mime_type ?? null,
      folder_id: validated.folder_id ?? null,
      description: validated.description ?? null,
      building: spatial.building,
      floor: spatial.floor,
      building_id: spatial.building_id,
      floor_id: spatial.floor_id,
      document_group_id: documentId,
      version_number: 1,
      is_current: true,
      created_by: user?.id ?? null,
    };

    const corePayload: DocumentInsert = {
      id: documentId,
      project_id: validated.project_id,
      name: validated.name,
      category: validated.category,
      storage_path: validated.storage_path,
      file_url: validated.storage_path,
      file_name: validated.file_name,
      file_size: validated.file_size ?? null,
      mime_type: validated.mime_type ?? null,
      folder_id: validated.folder_id ?? null,
      description: validated.description ?? null,
      created_by: user?.id ?? null,
    };

    const document = await insertDocumentRow(supabase, fullPayload, corePayload);

    if (!validated.skipClientNotify) {
      const projectName = await getProjectNameForNotify(validated.project_id);
      await notifyClientsIfEnabled("onUpload", validated.project_id, {
        title: "New document uploaded",
        message: formatUploadNotifyMessage(validated.name, projectName, "Documents"),
        type: "project_update",
        link: portalDocumentLink(validated.project_id, document.id),
      });
    }

    revalidatePath("/admin/documents");
    revalidatePath("/dashboard/documents");
    revalidatePath(`/dashboard/projects/${validated.project_id}`);
    return document.id;
  } catch (err) {
    if (err instanceof PublicError) throw err;
    if (err instanceof Error && /server components render/i.test(err.message)) {
      throw new PublicError(
        "Document may have uploaded, but the page failed to refresh. Close this dialog and refresh the documents list."
      );
    }
    throw internalError("createDocument", err);
  }
}

function isMissingDocumentSchemaError(message: string): boolean {
  const msg = message.toLowerCase();
  return (
    (msg.includes("schema cache") ||
      msg.includes("column") ||
      msg.includes("could not find")) &&
    (msg.includes("building") ||
      msg.includes("floor") ||
      msg.includes("document_group") ||
      msg.includes("version_number") ||
      msg.includes("is_current"))
  );
}

async function insertDocumentRow(
  userClient: Awaited<ReturnType<typeof createClient>>,
  fullPayload: DocumentInsert,
  corePayload: DocumentInsert
): Promise<{ id: string }> {
  const tryInsert = async (
    client: { from: typeof userClient.from },
    payload: DocumentInsert
  ) => client.from("documents").insert(payload).select("id").single();

  let { data, error } = await tryInsert(userClient, fullPayload);

  if (error && isMissingDocumentSchemaError(error.message)) {
    ({ data, error } = await tryInsert(userClient, corePayload));
  }

  if (error && isRlsOrPermissionError(error.message)) {
    const admin = createServiceRoleClient();
    ({ data, error } = await tryInsert(admin, fullPayload));
    if (error && isMissingDocumentSchemaError(error.message)) {
      ({ data, error } = await tryInsert(admin, corePayload));
    }
  }

  if (error || !data) {
    throw internalError("insertDocumentRow", error);
  }

  return data;
}

export async function createInvoice(data: {
  client_id: string;
  project_id?: string | null;
  invoice_number: string;
  amount: number;
  currency?: string | null;
  status: string;
  due_date?: string | null;
  description?: string | null;
  storage_path?: string | null;
  file_url?: string | null;
}) {
  const validated = parseOrThrow(createInvoiceSchema, data);

  const { supabase, user } = await requireStaffPermission("create", "invoices");

  if (validated.storage_path) {
    await verifyStoredUpload(UPLOAD_RULES.invoice, validated.storage_path, "createInvoice");
  }

  const payload: InvoiceInsert = {
    client_id: validated.client_id,
    project_id: validated.project_id,
    invoice_number: validated.invoice_number,
    amount: validated.amount,
    currency: DEFAULT_CURRENCY,
    status: validated.status,
    due_date: validated.due_date,
    description: validated.description,
    storage_path: validated.storage_path,
    file_url: validated.file_url ?? validated.storage_path,
    created_by: user?.id ?? null,
  };

  const { data: created, error } = await supabase
    .from("invoices")
    .insert(payload)
    .select("id, client_id, project_id, invoice_number, amount, currency, due_date, status")
    .single();
  if (error || !created) throw internalError("createInvoice", error);

  if (created.status === "sent" || created.status === "paid" || created.status === "overdue") {
    const kind =
      created.status === "sent"
        ? "sent"
        : created.status === "paid"
          ? "paid"
          : "overdue";
    const rule =
      kind === "paid" ? "onInvoicePaid" : ("onInvoiceSent" as const);

    try {
      if (await isNotificationRuleEnabled(rule)) {
        await notifyInvoiceRecipients(created, buildInvoiceNotificationPayload(created, kind));
      }
    } catch (err) {
      console.error("[createInvoice] notify", kind, err);
    }
  }

  revalidatePath("/admin/invoices");
  revalidatePath("/dashboard/invoices");
  revalidatePath("/admin/notifications");
  return created.id;
}

export async function attachInvoicePdf(
  invoiceId: string,
  data: { storage_path: string; file_url?: string | null }
) {
  const validated = parseOrThrow(attachInvoicePdfSchema, { invoiceId, data }).data;

  const { supabase, user } = await requireStaffPermission("update", "invoices");

  await verifyStoredUpload(UPLOAD_RULES.invoice, validated.storage_path, "attachInvoicePdf");

  const { error } = await supabase
    .from("invoices")
    .update({
      storage_path: validated.storage_path,
      file_url: validated.file_url ?? validated.storage_path,
      updated_by: user?.id ?? null,
    })
    .eq("id", invoiceId);

  if (error) throw internalError("attachInvoicePdf", error);
  revalidatePath("/admin/invoices");
  revalidatePath("/dashboard/invoices");
}

export async function getInvoiceDownloadUrl(invoiceId: string) {
  parseOrThrow(uuid("Invoice ID"), invoiceId);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new PublicError("You must be signed in");

  // Table RLS: staff see all; client_admin see their org invoices only.
  const { data: invoice, error } = await supabase
    .from("invoices")
    .select("storage_path, file_url, invoice_number")
    .eq("id", invoiceId)
    .is("deleted_at", null)
    .single();

  if (error || !invoice) {
    throw new PublicError("Invoice not found or you do not have access");
  }

  const path = resolveInvoiceStoragePath(invoice.storage_path, invoice.file_url);
  const fileName = `${invoice.invoice_number || "invoice"}.pdf`;

  if (!path) {
    if (invoice.file_url?.startsWith("http")) {
      return { url: invoice.file_url, fileName };
    }
    throw new PublicError("No PDF attached to this invoice");
  }

  try {
    const url = await createSignedStorageUrl("documents", path);
    return { url, fileName };
  } catch {
    // Invoice paths are {clientId}/invoices/... — documents bucket SELECT is
    // project-scoped, so client users need a service-role signed URL after RLS.
    const admin = createServiceRoleClient();
    const { data, error: signError } = await admin.storage
      .from("documents")
      .createSignedUrl(path, 3600);

    if (signError || !data?.signedUrl) {
      throw internalError("getInvoiceDownloadUrl", signError);
    }

    return { url: data.signedUrl, fileName };
  }
}

export async function assignUserToProject(projectId: string, userId: string) {
  parseOrThrow(uuid("Project ID"), projectId);
  parseOrThrow(uuid("User ID"), userId);

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

  if (!me || !isBuildViewStaffRole(me.role)) {
    throw new PublicError("Only BuildView staff can assign projects");
  }

  // Service role avoids RLS edge cases when staff helpers/enums differ across DBs.
  const admin = createServiceRoleClient();

  const { data: existing } = await admin
    .from("project_assignments")
    .select("id, deleted_at")
    .eq("project_id", projectId)
    .eq("user_id", userId)
    .maybeSingle();

  if (existing) {
    if (existing.deleted_at) {
      const { error } = await admin
        .from("project_assignments")
        .update({
          deleted_at: null,
          deleted_by: null,
          assigned_by: user.id,
          updated_by: user.id,
        })
        .eq("id", existing.id);

      if (error) throw internalError("assignUserToProject", error);
    }
  } else {
    const { error } = await admin.from("project_assignments").insert({
      project_id: projectId,
      user_id: userId,
      assigned_by: user.id,
      created_by: user.id,
      updated_by: null,
    });
    if (error) throw internalError("assignUserToProject", error);
  }

  const { data: project } = await admin
    .from("projects")
    .select("name")
    .eq("id", projectId)
    .maybeSingle();

  await notifyUsersIfEnabled("onProjectAssigned", [userId], {
    title: "You've been added to a project",
    message: project?.name
      ? `You now have access to ${project.name} in BuildView.`
      : "You now have access to a new project in BuildView.",
    type: "project_update",
    link: `/dashboard/projects/${projectId}`,
  });

  // Avoid revalidating /admin/users while the manage dialog is open — that refresh
  // can surface opaque RSC errors in the dialog even when the assign succeeded.
  revalidatePath("/admin/projects");
  revalidatePath(`/dashboard/projects/${projectId}`);
  revalidatePath("/dashboard");
}

export async function unassignUserFromProject(projectId: string, userId: string) {
  parseOrThrow(uuid("Project ID"), projectId);
  parseOrThrow(uuid("User ID"), userId);

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

  if (!me || !isBuildViewStaffRole(me.role)) {
    throw new PublicError("Only BuildView staff can update project access");
  }

  const admin = createServiceRoleClient();
  const { error } = await admin
    .from("project_assignments")
    .update({
      deleted_at: new Date().toISOString(),
      deleted_by: user.id,
      updated_by: user.id,
    })
    .eq("project_id", projectId)
    .eq("user_id", userId)
    .is("deleted_at", null);

  if (error) throw internalError("unassignUserFromProject", error);

  revalidatePath("/admin/projects");
  revalidatePath(`/dashboard/projects/${projectId}`);
  revalidatePath("/dashboard");
}

export async function updateUserProfile(data: {
  id: string;
  role: string;
  client_id: string | null;
  is_active: boolean;
  dashboard_type?: ClientDashboardType | null;
  client_dashboard_type?: ClientDashboardType;
}): Promise<{ success: true }> {
  const validated = parseOrThrow(updateUserSchema, data);

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

  if (!me || !isBuildViewStaffRole(me.role)) {
    throw new PublicError("Only BuildView staff can manage users");
  }

  const actorRole = me.role as UserRole;

  // Load current profile so we can detect role / dashboard changes.
  const { data: existing } = await supabase
    .from("users")
    .select("role, client_id, dashboard_type, is_active")
    .eq("id", validated.id)
    .maybeSingle();

  if (!existing) throw new PublicError("User not found");

  const roleChanging = existing.role !== validated.role;
  const nextDashboard = isClientPortalRole(validated.role)
    ? (validated.client_dashboard_type ?? validated.dashboard_type ?? null)
    : null;
  const dashboardChanging =
    (existing.dashboard_type ?? null) !== (nextDashboard ?? null) ||
    Boolean(validated.client_dashboard_type);

  if ((roleChanging || dashboardChanging) && !canAssignRoles(actorRole)) {
    throw new PublicError("Only Super Admin can assign roles and dashboards");
  }

  if (isClientPortalRole(validated.role) && !validated.client_id) {
    throw new PublicError(
      "Link a client organization before assigning Client Admin or other client portal roles."
    );
  }

  const admin = createServiceRoleClient();

  // Apply dashboard to the client org when the column exists (Super Admin only path above).
  if (
    canAssignRoles(actorRole) &&
    isClientPortalRole(validated.role) &&
    validated.client_id &&
    validated.client_dashboard_type
  ) {
    const { error: clientError } = await admin
      .from("clients")
      .update({
        dashboard_type: validated.client_dashboard_type,
        updated_by: user.id,
      } as ClientUpdate)
      .eq("id", validated.client_id)
      .is("deleted_at", null);

    if (clientError) {
      const msg = clientError.message.toLowerCase();
      // Migration 017 not applied yet — still save on the user so portfolio can work.
      if (!(msg.includes("dashboard_type") && (msg.includes("schema cache") || msg.includes("column")))) {
        throw internalError("updateUserProfile", clientError);
      }
    }
  }

  const payload: UserUpdate = {
    role: validated.role,
    client_id: isClientPortalRole(validated.role) ? validated.client_id : null,
    is_active: validated.is_active,
    // Persist on the user so portfolio works even before clients.dashboard_type exists.
    dashboard_type: isClientPortalRole(validated.role)
      ? (validated.client_dashboard_type ?? validated.dashboard_type ?? null)
      : null,
    updated_by: user.id,
  };

  const { error } = await admin.from("users").update(payload).eq("id", validated.id);

  if (error) {
    const msg = error.message.toLowerCase();
    if (msg.includes("dashboard_type") && (msg.includes("schema cache") || msg.includes("column"))) {
      logServerError("updateUserProfile", error, { hint: "Apply migration 017_client_dashboard_type.sql" });
      throw new PublicError("Dashboard settings can't be saved yet. Contact BuildView support.");
    }
    if (msg.includes("invalid input value for enum") || msg.includes("user_role")) {
      logServerError("updateUserProfile", error, {
        hint: "Apply supabase/FIX_user_roles_enum.sql",
        role: validated.role,
      });
      throw new PublicError("This role can't be assigned yet. Contact BuildView support.");
    }
    throw internalError("updateUserProfile", error);
  }

  // Revalidate admin lists only — avoid cascading /dashboard RSC failures into the action result.
  try {
    revalidatePath("/admin/users");
    revalidatePath("/admin/clients");
    revalidatePath("/admin");
  } catch (revalidateError) {
    console.warn("[updateUserProfile] revalidatePath failed:", revalidateError);
  }

  return { success: true };
}

export async function updateClientRecord(data: {
  id: string;
  name: string;
  company_name?: string | null;
  email: string;
  phone?: string | null;
  address?: string | null;
  subscription_status: string;
  is_active: boolean;
  dashboard_type?: ClientDashboardType;
}) {
  const validated = parseOrThrow(updateClientSchema, data);

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

  if (!me || !isBuildViewStaffRole(me.role as UserRole)) {
    throw new PublicError("Only BuildView staff can update clients");
  }

  if (validated.dashboard_type !== undefined && !canAssignRoles(me.role as UserRole)) {
    // Staff can edit client details; only Super Admin changes dashboard type.
    const { data: existingClient } = await supabase
      .from("clients")
      .select("dashboard_type")
      .eq("id", validated.id)
      .maybeSingle();
    if (
      existingClient &&
      (existingClient.dashboard_type ?? "construction") !==
        (validated.dashboard_type ?? "construction")
    ) {
      throw new PublicError("Only Super Admin can assign client dashboards");
    }
  }

  const payload: ClientUpdate = {
    name: validated.name,
    company_name: validated.company_name ?? null,
    email: validated.email,
    phone: validated.phone ?? null,
    address: validated.address ?? null,
    subscription_status: validated.subscription_status as ClientUpdate["subscription_status"],
    is_active: validated.is_active,
    ...(canAssignRoles(me.role as UserRole)
      ? { dashboard_type: validated.dashboard_type ?? "construction" }
      : {}),
    updated_by: user.id,
  };

  const admin = createServiceRoleClient();
  const { error } = await admin
    .from("clients")
    .update(payload)
    .eq("id", validated.id)
    .is("deleted_at", null);

  if (error) throw internalError("updateClientRecord", error);

  // Keep linked portal users in sync so their session resolves the new dashboard.
  if (validated.dashboard_type) {
    await admin
      .from("users")
      .update({
        dashboard_type: validated.dashboard_type,
        updated_by: user?.id ?? null,
      } as UserUpdate)
      .eq("client_id", validated.id)
      .is("deleted_at", null);
  }

  revalidatePath("/admin/clients");
  revalidatePath("/admin/projects");
  revalidatePath("/admin/users");
  revalidatePath("/dashboard");
}

export async function updateProjectRecord(data: {
  id: string;
  name: string;
  client_id: string;
  client_name: string;
  location: string;
  status: string;
  description?: string | null;
  start_date?: string | null;
  completion_date?: string | null;
  area_sqft?: number | null;
  portfolio_category?: "architecture" | "interior" | "real_estate" | null;
}): Promise<{ error?: string }> {
  const validation = validate(updateProjectSchema, data);
  if (!validation.success) return { error: validation.error };
  const validated = validation.data;

  let supabase: Awaited<ReturnType<typeof createClient>>;
  let user: { id: string };
  try {
    ({ supabase, user } = await requireStaffPermission("update", "projects"));
  } catch (err) {
    return { error: toPublicMessage("updateProjectRecord", err, "Not allowed") };
  }

  const payload: ProjectUpdate = {
    name: validated.name,
    client_id: validated.client_id,
    client_name: validated.client_name,
    location: validated.location,
    status: validated.status,
    description: validated.description,
    start_date: validated.start_date,
    completion_date: validated.completion_date,
    area_sqft: validated.area_sqft ?? null,
    portfolio_category: validated.portfolio_category ?? null,
    updated_by: user?.id ?? null,
  };

  const { data: updated, error } = await supabase
    .from("projects")
    .update(payload)
    .eq("id", validated.id)
    .is("deleted_at", null)
    .select("id");

  let updatedCount = updated?.length ?? 0;
  if (error) {
    const msg = error.message.toLowerCase();
    const missingPortfolioCols =
      (msg.includes("area_sqft") || msg.includes("portfolio_category")) &&
      (msg.includes("schema cache") || msg.includes("column") || msg.includes("could not find"));

    if (!missingPortfolioCols) {
      return { error: toPublicMessage("updateProjectRecord", error, "Failed to update project") };
    }

    const { area_sqft: _a, portfolio_category: _c, ...basePayload } = payload;
    const { data: retried, error: retryError } = await supabase
      .from("projects")
      .update(basePayload)
      .eq("id", validated.id)
      .is("deleted_at", null)
      .select("id");
    if (retryError) {
      return { error: toPublicMessage("updateProjectRecord", retryError, "Failed to update project") };
    }
    updatedCount = retried?.length ?? 0;
  }

  // RLS filters out rows silently, so an empty result means nothing was saved.
  if (updatedCount === 0) {
    return { error: "Project was not updated. It may have been deleted or you lack permission." };
  }

  revalidatePath("/admin/projects");
  revalidatePath(`/admin/projects/${validated.id}`);
  revalidatePath("/dashboard/projects");
  revalidatePath(`/dashboard/projects/${validated.id}`);
  revalidatePath("/dashboard");
  return {};
}

function revalidateProjectPaths(projectId?: string) {
  revalidatePath("/admin/projects");
  revalidatePath("/dashboard/projects");
  revalidatePath("/admin");
  revalidatePath("/dashboard");
  if (projectId) {
    revalidatePath(`/dashboard/projects/${projectId}`);
    revalidatePath(`/admin/projects/${projectId}`);
  }
}

type ProjectRemovalNotice = "deleted" | "suspended";

async function notifyProjectRemovedFromPortal(
  projectId: string,
  projectName: string,
  action: ProjectRemovalNotice
) {
  const copy: Record<ProjectRemovalNotice, { title: string; message: string }> = {
    deleted: {
      title: "Project removed",
      message: `"${projectName}" has been removed from your BuildView portal.`,
    },
    suspended: {
      title: "Project suspended",
      message: `"${projectName}" has been suspended and is temporarily unavailable in your portal.`,
    },
  };

  const { title, message } = copy[action];
  await notifyClientsIfEnabled("onProjectRemoved", projectId, {
    title,
    message,
    type: "project_update",
    link: "/dashboard/projects",
  });
}

async function getActiveProjectSummary(projectId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("projects")
    .select("id, name, client_id, status")
    .eq("id", projectId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) throw internalError("getActiveProjectSummary", error);
  if (!data) throw new PublicError("Project not found");
  return data;
}

export async function softDeleteProject(projectId: string) {
  parseOrThrow(uuid("Project ID"), projectId);

  const { supabase, user } = await requireStaffPermission("delete", "projects");

  const project = await getActiveProjectSummary(projectId);

  const { error } = await supabase
    .from("projects")
    .update({
      deleted_at: new Date().toISOString(),
      deleted_by: user?.id ?? null,
      updated_by: user?.id ?? null,
    })
    .eq("id", projectId)
    .is("deleted_at", null);

  if (error) throw internalError("softDeleteProject", error);

  await notifyProjectRemovedFromPortal(projectId, project.name, "deleted");
  revalidateProjectPaths(projectId);
}

export async function suspendProject(projectId: string) {
  parseOrThrow(uuid("Project ID"), projectId);

  const { supabase, user } = await requireStaffPermission("update", "projects");

  const project = await getActiveProjectSummary(projectId);

  const { error } = await supabase
    .from("projects")
    .update({
      status: "suspended" as ProjectStatus,
      updated_by: user?.id ?? null,
    })
    .eq("id", projectId)
    .is("deleted_at", null);

  if (error) throw internalError("suspendProject", error);

  await notifyProjectRemovedFromPortal(projectId, project.name, "suspended");
  revalidateProjectPaths(projectId);
}

/** Restore suspended projects back to On Hold. */
export async function restoreProject(projectId: string) {
  parseOrThrow(uuid("Project ID"), projectId);

  const { supabase, user } = await requireStaffPermission("update", "projects");

  const { error } = await supabase
    .from("projects")
    .update({
      status: "on_hold" as ProjectStatus,
      updated_by: user?.id ?? null,
    })
    .eq("id", projectId)
    .is("deleted_at", null);

  if (error) throw internalError("restoreProject", error);

  revalidateProjectPaths(projectId);
}

export async function softDeleteClient(clientId: string) {
  parseOrThrow(uuid("Client ID"), clientId);

  const { supabase, user } = await requireStaffPermission("delete", "clients");

  const now = new Date().toISOString();
  const actorId = user?.id ?? null;

  // Soft-delete the client's projects first so they leave admin/workspace lists.
  const { error: projectError } = await supabase
    .from("projects")
    .update({
      deleted_at: now,
      deleted_by: actorId,
      updated_by: actorId,
    })
    .eq("client_id", clientId)
    .is("deleted_at", null);

  if (projectError) throw internalError("softDeleteClient", projectError);

  // Unlink portal users from this client so they can be reassigned later.
  const { error: usersError } = await supabase
    .from("users")
    .update({
      client_id: null,
      updated_by: actorId,
    })
    .eq("client_id", clientId)
    .is("deleted_at", null);

  if (usersError) throw internalError("softDeleteClient", usersError);

  const { error } = await supabase
    .from("clients")
    .update({
      deleted_at: now,
      deleted_by: actorId,
      updated_by: actorId,
      is_active: false,
    })
    .eq("id", clientId)
    .is("deleted_at", null);

  if (error) throw internalError("softDeleteClient", error);

  revalidatePath("/admin/clients");
  revalidatePath("/admin/projects");
  revalidatePath("/admin");
  revalidatePath("/dashboard");
}

export async function updateInvoiceStatus(invoiceId: string, status: string) {
  const validated = parseOrThrow(updateInvoiceStatusSchema, { id: invoiceId, status });

  const { supabase, user } = await requireStaffPermission("update", "invoices");

  const update: InvoiceUpdate = {
    status: validated.status as InvoiceStatus,
    updated_by: user?.id ?? null,
  };

  if (validated.status === "paid") {
    update.paid_date = new Date().toISOString().split("T")[0];
  }

  const { error } = await supabase
    .from("invoices")
    .update(update)
    .eq("id", invoiceId);

  if (error) throw internalError("updateInvoiceStatus", error);

  const admin = createServiceRoleClient();
  const { data: invoice } = await admin
    .from("invoices")
    .select("id, client_id, project_id, invoice_number, amount, currency, due_date, status")
    .eq("id", invoiceId)
    .maybeSingle();

  if (invoice) {
  if (validated.status === "sent" || validated.status === "paid" || validated.status === "overdue") {
      const kind =
        validated.status === "sent"
          ? "sent"
          : validated.status === "paid"
            ? "paid"
            : "overdue";
      const rule =
        kind === "paid" ? "onInvoicePaid" : ("onInvoiceSent" as const);

      try {
        if (await isNotificationRuleEnabled(rule)) {
          await notifyInvoiceRecipients(
            invoice,
            buildInvoiceNotificationPayload(invoice, kind)
          );
        }
      } catch (err) {
        console.error("[updateInvoiceStatus] notify", kind, err);
      }
    }
  }

  revalidatePath("/admin/invoices");
  revalidatePath("/dashboard/invoices");
  revalidatePath("/admin/notifications");
}

export type { InvoiceNotificationKind };

export async function sendInvoiceNotification(
  invoiceId: string,
  kind: InvoiceNotificationKind
): Promise<{ success: boolean; error?: string }> {
  const validation = validate(sendInvoiceNotificationSchema, { invoiceId, kind });
  if (!validation.success) return { success: false, error: validation.error };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "You must be signed in" };

  const { data: me } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (!me || (me.role !== "super_admin" && me.role !== "admin")) {
    return {
      success: false,
      error: "Only Super Admin and Admin can send invoice notifications",
    };
  }

  const admin = createServiceRoleClient();
  const { data: invoice, error } = await admin
    .from("invoices")
    .select("id, client_id, project_id, invoice_number, amount, currency, due_date, status")
    .eq("id", invoiceId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error || !invoice) {
    return { success: false, error: "Invoice not found" };
  }

  try {
    await notifyInvoiceRecipients(
      invoice,
      buildInvoiceNotificationPayload(invoice, kind)
    );
    revalidatePath("/admin/invoices");
    revalidatePath("/dashboard/invoices");
    revalidatePath("/admin/notifications");
    revalidatePath("/dashboard/notifications");
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: toPublicMessage("sendInvoiceNotification", err, "Failed to send notification"),
    };
  }
}

