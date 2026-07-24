"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { createSignedStorageUrl } from "@/lib/supabase/storage-server";
import { resolveInvoiceStoragePath } from "@/lib/supabase/storage";
import { notifyClientUsers, notifyClientOrgIfEnabled, notifyClientsIfEnabled, notifyUsersIfEnabled } from "@/lib/actions/notifications";
import { isNotificationRuleEnabled } from "@/lib/actions/platform-settings";
import { normalizeMatterportUrl } from "@/lib/matterport";
import { resolveSpatialForWrite } from "@/lib/admin/spatial-resolve";
import { buildTourDescription } from "@/lib/admin/tour-metadata";
import { createTourSchema } from "@/lib/validations/tour";
import { createReportSchema } from "@/lib/validations/report";
import {
  createDocumentSchema,
  createFolderSchema,
} from "@/lib/validations/document";
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
  UserUpdate,
} from "@/lib/types";
import {
  updateClientSchema,
  updateInvoiceStatusSchema,
  updateProjectSchema,
  updateUserSchema,
} from "@/lib/validations/admin";
import { isBuildViewStaffRole, isClientPortalRole } from "@/lib/auth/roles";

export async function createClientRecord(data: {
  name: string;
  company_name?: string;
  email: string;
  phone?: string;
  address?: string;
}) {
  const supabase = await createClient();
  const { error } = await supabase.from("clients").insert(data);
  if (error) throw new Error(error.message);
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
  start_date?: string;
  completion_date?: string;
  status: string;
  description?: string;
  area_sqft?: number | null;
  portfolio_category?: "architecture" | "interior" | "real_estate" | null;
  cover_image_url?: string | null;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const payload: ProjectInsert = {
    name: data.name,
    client_id: data.client_id,
    client_name: data.client_name,
    location: data.location,
    status: data.status as ProjectStatus,
    description: data.description ?? null,
    start_date: data.start_date ?? null,
    completion_date: data.completion_date ?? null,
    area_sqft: data.area_sqft ?? null,
    portfolio_category: data.portfolio_category ?? null,
    cover_image_url: data.cover_image_url ?? null,
    created_by: user?.id ?? null,
  };

  const finish = async (projectId: string) => {
    try {
      await assignClientOrgUsersToProject(projectId, data.client_id, user?.id ?? null);
    } catch {
      // Non-fatal: org-wide access still works after has_project_access SQL fix
    }
    await notifyClientOrgIfEnabled("onProjectAssigned", data.client_id, {
      title: "New project available",
      message: `${data.name} has been added to your BuildView portal.`,
      type: "project_update",
      link: `/dashboard/projects/${projectId}`,
    });
    revalidatePath("/admin/projects");
    revalidatePath("/dashboard/projects");
    revalidatePath("/dashboard");
    return projectId;
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
      if (retryError || !retryCreated) throw new Error(retryError?.message ?? "Failed to create project");
      return finish(retryCreated.id);
    }
    throw new Error(error?.message ?? "Failed to create project");
  }

  return finish(created.id);
}

/** Set or clear a project's cover thumbnail URL after upload. */
export async function updateProjectCoverImage(
  projectId: string,
  coverImageUrl: string | null
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase
    .from("projects")
    .update({
      cover_image_url: coverImageUrl,
      updated_by: user?.id ?? null,
    } satisfies ProjectUpdate)
    .eq("id", projectId)
    .is("deleted_at", null);

  if (error) throw new Error(error.message);

  revalidatePath("/admin/projects");
  revalidatePath(`/admin/projects/${projectId}`);
  revalidatePath("/dashboard/projects");
  revalidatePath(`/dashboard/projects/${projectId}`);
  revalidatePath("/dashboard");
}

export async function createTour(data: {
  project_id: string;
  name: string;
  matterport_url: string;
  capture_date?: string;
  description?: string;
  building?: string;
  floor?: string;
  building_id?: string;
  floor_id?: string;
}) {
  const parsed = createTourSchema.safeParse(data);
  if (!parsed.success) {
    throw new Error(parsed.error.errors[0]?.message ?? "Invalid tour data");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const normalizedUrl = normalizeMatterportUrl(parsed.data.matterport_url);

  const spatial = await resolveSpatialForWrite(supabase, parsed.data.project_id, {
    building: data.building,
    floor: data.floor,
    building_id: data.building_id,
    floor_id: data.floor_id,
  });

  const structuredDescription = buildTourDescription({
    building: spatial.building ?? undefined,
    floor: spatial.floor ?? undefined,
    building_id: spatial.building_id,
    floor_id: spatial.floor_id,
    notes: parsed.data.description,
  });

  const payload: ProjectTourInsert = {
    project_id: parsed.data.project_id,
    name: parsed.data.name,
    matterport_url: normalizedUrl,
    capture_date: parsed.data.capture_date ?? null,
    description: structuredDescription ?? parsed.data.description ?? null,
    building_id: spatial.building_id,
    floor_id: spatial.floor_id,
    created_by: user?.id ?? null,
  };

  const { error } = await supabase.from("project_tours").insert(payload);
  if (error) throw new Error(error.message);

  await notifyClientsIfEnabled("onUpload", parsed.data.project_id, {
    title: "New Matterport scan available",
    message: `${parsed.data.name} has been uploaded to your project.`,
    type: "project_update",
    link: `/dashboard/projects/${parsed.data.project_id}`,
  });

  revalidatePath("/admin/tours");
  revalidatePath(`/admin/projects/${parsed.data.project_id}`);
  revalidatePath(`/dashboard/projects/${parsed.data.project_id}`);
  revalidatePath("/dashboard/projects");
  revalidatePath("/dashboard");
}

export async function createReport(data: {
  project_id: string;
  title: string;
  report_type: string;
  report_date: string;
  description?: string;
  storage_path: string;
  file_name: string;
  file_size?: number;
  mime_type?: string;
  building?: string;
  floor?: string;
  /** When true, caller already notifies clients (e.g. upload orchestrator). */
  skipClientNotify?: boolean;
}) {
  const validation = createReportSchema.safeParse(data);
  if (!validation.success) {
    throw new Error(validation.error.errors[0]?.message ?? "Invalid report data");
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
  if (error || !report) throw new Error(error?.message ?? "Failed to create report");

  if (!data.skipClientNotify) {
    await notifyClientsIfEnabled("onUpload", validated.project_id, {
      title: "New report uploaded",
      message: `${validated.title} is now available in your project portal.`,
      type: "project_update",
      link: `/dashboard/projects/${validated.project_id}`,
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
  parent_id?: string;
}) {
  const validation = createFolderSchema.safeParse(data);
  if (!validation.success) {
    throw new Error(validation.error.errors[0]?.message ?? "Invalid folder data");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const validated = validation.data;

  const payload: DocumentFolderInsert = {
    project_id: validated.project_id,
    name: validated.name,
    parent_id: validated.parent_id ?? null,
    sort_order: 0,
    created_by: user?.id ?? null,
    updated_by: user?.id ?? null,
  };

  const { error } = await supabase.from("document_folders").insert(payload);

  if (error) throw new Error(error.message);

  revalidatePath("/admin/documents");
  revalidatePath(`/dashboard/projects/${validated.project_id}`);
  revalidatePath("/dashboard/documents");
}

export async function createDocument(data: {
  project_id: string;
  name: string;
  category: string;
  storage_path: string;
  file_name: string;
  file_size?: number;
  mime_type?: string;
  folder_id?: string;
  description?: string;
  building?: string;
  floor?: string;
  /** When true, caller already notifies clients (e.g. upload orchestrator). */
  skipClientNotify?: boolean;
}) {
  try {
    const validation = createDocumentSchema.safeParse(data);
    if (!validation.success) {
      throw new Error(validation.error.errors[0]?.message ?? "Invalid document data");
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const validated = validation.data;
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

    if (!data.skipClientNotify) {
      await notifyClientsIfEnabled("onUpload", validated.project_id, {
        title: "New document uploaded",
        message: `${validated.name} is now available in your documents.`,
        type: "project_update",
        link: `/dashboard/projects/${validated.project_id}`,
      });
    }

    revalidatePath("/admin/documents");
    revalidatePath("/dashboard/documents");
    revalidatePath(`/dashboard/projects/${validated.project_id}`);
    return document.id;
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to create document";
    if (/server components render/i.test(message)) {
      throw new Error(
        "Document may have uploaded, but the page failed to refresh. Close this dialog and refresh the documents list."
      );
    }
    throw new Error(message);
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

function isRlsOrPermissionError(message: string): boolean {
  const msg = message.toLowerCase();
  return (
    msg.includes("row-level security") ||
    msg.includes("permission denied") ||
    msg.includes("violates row-level security")
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
    throw new Error(error?.message ?? "Failed to create document");
  }

  return data;
}

export async function createInvoice(data: {
  client_id: string;
  project_id?: string;
  invoice_number: string;
  amount: number;
  currency?: string;
  status: string;
  due_date?: string;
  description?: string;
  storage_path?: string;
  file_url?: string;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const payload: InvoiceInsert = {
    client_id: data.client_id,
    project_id: data.project_id ?? null,
    invoice_number: data.invoice_number,
    amount: data.amount,
    currency: data.currency ?? "USD",
    status: data.status as InvoiceStatus,
    due_date: data.due_date ?? null,
    description: data.description ?? null,
    storage_path: data.storage_path ?? null,
    file_url: data.file_url ?? data.storage_path ?? null,
    created_by: user?.id ?? null,
  };

  const { data: created, error } = await supabase
    .from("invoices")
    .insert(payload)
    .select("id")
    .single();
  if (error || !created) throw new Error(error?.message ?? "Failed to create invoice");
  revalidatePath("/admin/invoices");
  return created.id;
}

export async function attachInvoicePdf(
  invoiceId: string,
  data: { storage_path: string; file_url?: string }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase
    .from("invoices")
    .update({
      storage_path: data.storage_path,
      file_url: data.file_url ?? data.storage_path,
      updated_by: user?.id ?? null,
    })
    .eq("id", invoiceId);

  if (error) throw new Error(error.message);
  revalidatePath("/admin/invoices");
  revalidatePath("/dashboard/invoices");
}

export async function getInvoiceDownloadUrl(invoiceId: string) {
  const supabase = await createClient();
  const { data: invoice } = await supabase
    .from("invoices")
    .select("storage_path, file_url, invoice_number")
    .eq("id", invoiceId)
    .single();

  if (!invoice) throw new Error("Invoice not found");

  const path = resolveInvoiceStoragePath(invoice.storage_path, invoice.file_url);
  if (!path) throw new Error("No PDF attached to this invoice");

  const url = await createSignedStorageUrl("documents", path);
  return { url, fileName: `${invoice.invoice_number}.pdf` };
}

export async function assignUserToProject(projectId: string, userId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: existing } = await supabase
    .from("project_assignments")
    .select("id, deleted_at")
    .eq("project_id", projectId)
    .eq("user_id", userId)
    .maybeSingle();

  if (existing) {
    if (existing.deleted_at) {
      const { error } = await supabase
        .from("project_assignments")
        .update({
          deleted_at: null,
          deleted_by: null,
          assigned_by: user?.id ?? null,
          updated_by: user?.id ?? null,
        })
        .eq("id", existing.id);

      if (error) throw new Error(error.message);
    }
  } else {
    const { error } = await supabase.from("project_assignments").insert({
      project_id: projectId,
      user_id: userId,
      assigned_by: user?.id ?? null,
      created_by: user?.id ?? null,
      updated_by: null,
    });
    if (error) throw new Error(error.message);
  }

  const { data: project } = await supabase
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

  revalidatePath("/admin/projects");
  revalidatePath("/admin/users");
  revalidatePath(`/dashboard/projects/${projectId}`);
}

export async function unassignUserFromProject(projectId: string, userId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase
    .from("project_assignments")
    .update({
      deleted_at: new Date().toISOString(),
      deleted_by: user?.id ?? null,
      updated_by: user?.id ?? null,
    })
    .eq("project_id", projectId)
    .eq("user_id", userId)
    .is("deleted_at", null);

  if (error) throw new Error(error.message);

  revalidatePath("/admin/projects");
  revalidatePath("/admin/users");
  revalidatePath(`/dashboard/projects/${projectId}`);
}

export async function updateUserProfile(data: {
  id: string;
  role: string;
  client_id: string | null;
  is_active: boolean;
  dashboard_type?: ClientDashboardType | null;
  client_dashboard_type?: ClientDashboardType;
}) {
  const validation = updateUserSchema.safeParse(data);
  if (!validation.success) {
    throw new Error(validation.error.errors[0]?.message ?? "Invalid user data");
  }

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

  if (!me || !isBuildViewStaffRole(me.role)) {
    throw new Error("Only BuildView staff can manage users");
  }

  const validated = validation.data;

  if (isClientPortalRole(validated.role) && !validated.client_id) {
    throw new Error("Client users must be linked to a client organization.");
  }

  const admin = createServiceRoleClient();

  // Apply dashboard to the client org when the column exists.
  if (
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
        throw new Error(clientError.message);
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
      throw new Error(
        "Database migration required. Paste and run supabase/migrations/017_client_dashboard_type.sql in the Supabase SQL Editor, then Save again."
      );
    }
    throw new Error(error.message);
  }

  revalidatePath("/admin/users");
  revalidatePath("/admin/clients");
  revalidatePath("/admin");
  revalidatePath("/dashboard");
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
  const validation = updateClientSchema.safeParse(data);
  if (!validation.success) {
    throw new Error(validation.error.errors[0]?.message ?? "Invalid client data");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const validated = validation.data;

  const payload: ClientUpdate = {
    name: validated.name,
    company_name: validated.company_name ?? null,
    email: validated.email,
    phone: validated.phone ?? null,
    address: validated.address ?? null,
    subscription_status: validated.subscription_status as ClientUpdate["subscription_status"],
    is_active: validated.is_active,
    dashboard_type: validated.dashboard_type ?? "construction",
    updated_by: user?.id ?? null,
  };

  const admin = createServiceRoleClient();
  const { error } = await admin
    .from("clients")
    .update(payload)
    .eq("id", validated.id)
    .is("deleted_at", null);

  if (error) throw new Error(error.message);

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
}) {
  const validation = updateProjectSchema.safeParse(data);
  if (!validation.success) {
    throw new Error(validation.error.errors[0]?.message ?? "Invalid project data");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const validated = validation.data;

  const payload: ProjectUpdate = {
    name: validated.name,
    client_id: validated.client_id,
    client_name: validated.client_name,
    location: validated.location,
    status: validated.status as ProjectStatus,
    description: validated.description ?? null,
    start_date: validated.start_date ?? null,
    completion_date: validated.completion_date ?? null,
    area_sqft: validated.area_sqft ?? null,
    portfolio_category: validated.portfolio_category ?? null,
    updated_by: user?.id ?? null,
  };

  const { error } = await supabase
    .from("projects")
    .update(payload)
    .eq("id", validated.id)
    .is("deleted_at", null);

  if (error) {
    const msg = error.message.toLowerCase();
    const missingPortfolioCols =
      (msg.includes("area_sqft") || msg.includes("portfolio_category")) &&
      (msg.includes("schema cache") || msg.includes("column") || msg.includes("could not find"));

    if (missingPortfolioCols) {
      const { area_sqft: _a, portfolio_category: _c, ...basePayload } = payload;
      const { error: retryError } = await supabase
        .from("projects")
        .update(basePayload)
        .eq("id", validated.id)
        .is("deleted_at", null);
      if (retryError) throw new Error(retryError.message);
    } else {
      throw new Error(error.message);
    }
  }

  revalidatePath("/admin/projects");
  revalidatePath("/dashboard/projects");
  revalidatePath(`/dashboard/projects/${validated.id}`);
  revalidatePath("/dashboard");
}

export async function softDeleteProject(projectId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase
    .from("projects")
    .update({
      deleted_at: new Date().toISOString(),
      deleted_by: user?.id ?? null,
      updated_by: user?.id ?? null,
    })
    .eq("id", projectId)
    .is("deleted_at", null);

  if (error) throw new Error(error.message);

  revalidatePath("/admin/projects");
  revalidatePath("/dashboard/projects");
  revalidatePath("/admin");
}

export async function softDeleteClient(clientId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

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

  if (projectError) throw new Error(projectError.message);

  // Unlink portal users from this client so they can be reassigned later.
  const { error: usersError } = await supabase
    .from("users")
    .update({
      client_id: null,
      updated_by: actorId,
    })
    .eq("client_id", clientId)
    .is("deleted_at", null);

  if (usersError) throw new Error(usersError.message);

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

  if (error) throw new Error(error.message);

  revalidatePath("/admin/clients");
  revalidatePath("/admin/projects");
  revalidatePath("/admin");
  revalidatePath("/dashboard");
}

export async function updateInvoiceStatus(invoiceId: string, status: string) {
  const validation = updateInvoiceStatusSchema.safeParse({ id: invoiceId, status });
  if (!validation.success) {
    throw new Error(validation.error.errors[0]?.message ?? "Invalid invoice status");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const update: InvoiceUpdate = {
    status: validation.data.status as InvoiceStatus,
    updated_by: user?.id ?? null,
  };

  if (validation.data.status === "paid") {
    update.paid_date = new Date().toISOString().split("T")[0];
  }

  const { error } = await supabase
    .from("invoices")
    .update(update)
    .eq("id", invoiceId);

  if (error) throw new Error(error.message);

  if (validation.data.status === "sent" || validation.data.status === "paid") {
    const { data: invoice } = await supabase
      .from("invoices")
      .select("client_id, invoice_number, amount, currency")
      .eq("id", invoiceId)
      .single();

    if (invoice) {
      if (validation.data.status === "sent") {
        try {
          if (await isNotificationRuleEnabled("onInvoiceSent")) {
            await notifyClientUsers(invoice.client_id, {
              title: `Invoice ${invoice.invoice_number} sent`,
              message: `A new invoice for ${invoice.currency} ${invoice.amount} is ready to view.`,
              type: "invoice_update",
              link: "/dashboard/invoices",
            });
          }
        } catch (err) {
          console.error("[updateInvoiceStatus] notify sent", err);
        }
      } else {
        try {
          if (await isNotificationRuleEnabled("onInvoicePaid")) {
            await notifyClientUsers(invoice.client_id, {
              title: `Invoice ${invoice.invoice_number} paid`,
              message: `Payment recorded for ${invoice.currency} ${invoice.amount}.`,
              type: "invoice_update",
              link: "/dashboard/invoices",
            });
          }
        } catch (err) {
          console.error("[updateInvoiceStatus] notify paid", err);
        }
      }
    }
  }

  revalidatePath("/admin/invoices");
  revalidatePath("/dashboard/invoices");
  revalidatePath("/admin/notifications");
}

