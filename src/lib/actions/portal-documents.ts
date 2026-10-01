"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { isClientPortalRole } from "@/lib/auth/roles";
import { isProjectVisibleInClientPortal } from "@/lib/portal/project-visibility";
import { resolveClientDashboardType } from "@/lib/portal/dashboard-type";
import {
  PORTAL_DOCUMENT_MAX_BYTES,
  PORTAL_DOCUMENT_MIME_TYPES,
} from "@/lib/portal/document-upload";
import {
  STORAGE_BUCKETS,
  type ClientDashboardType,
  type DocumentCategory,
  type DocumentInsert,
  type ProjectStatus,
  type UserRole,
} from "@/lib/types";

type Result<T> = ({ ok: true } & T) | { ok: false; error: string };

const CATEGORIES: DocumentCategory[] = [
  "drawings",
  "boqs",
  "contracts",
  "approvals",
  "technical_documents",
  "other",
];

/**
 * Portfolio Showcase clients upload documents through the service role so every
 * client role can contribute without widening the documents storage policies.
 */
async function authorizePortfolioUpload(
  projectId: string
): Promise<{ ok: true; userId: string } | { ok: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Please sign in again." };

  const admin = createServiceRoleClient();
  const { data: profile } = await admin
    .from("users")
    .select("role, client_id, is_active, deleted_at, dashboard_type")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || !profile.is_active || profile.deleted_at) {
    return { ok: false, error: "Your account is not active." };
  }
  if (!isClientPortalRole(profile.role as UserRole)) {
    return { ok: false, error: "Only client accounts can upload here." };
  }

  const { data: project } = await admin
    .from("projects")
    .select("id, client_id, status, deleted_at, client:clients(dashboard_type)")
    .eq("id", projectId)
    .maybeSingle();

  if (
    !project ||
    !isProjectVisibleInClientPortal({
      status: project.status as ProjectStatus,
      deleted_at: project.deleted_at,
    })
  ) {
    return { ok: false, error: "This project is not available." };
  }

  const projectClient = (
    project as unknown as { client: { dashboard_type: ClientDashboardType | null } | null }
  ).client;
  const dashboardType = resolveClientDashboardType(
    { dashboard_type: profile.dashboard_type as ClientDashboardType | null },
    projectClient
  );
  if (dashboardType !== "portfolio") {
    return { ok: false, error: "Document upload is only available in Portfolio Showcase." };
  }

  let hasAccess = Boolean(profile.client_id && profile.client_id === project.client_id);
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
  if (!hasAccess) return { ok: false, error: "You do not have access to this project." };

  return { ok: true, userId: user.id };
}

export async function createPortalDocumentUploadUrl(input: {
  projectId: string;
  fileName: string;
  fileSize: number;
}): Promise<Result<{ path: string; token: string }>> {
  if (!input.fileName?.trim()) return { ok: false, error: "Choose a file to upload." };
  if (!Number.isFinite(input.fileSize) || input.fileSize <= 0) {
    return { ok: false, error: "The selected file is empty." };
  }
  if (input.fileSize > PORTAL_DOCUMENT_MAX_BYTES) {
    return { ok: false, error: "Files must be 100 MB or smaller." };
  }

  const auth = await authorizePortfolioUpload(input.projectId);
  if (!auth.ok) return auth;

  const safeName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${input.projectId}/root/${Date.now()}-${safeName}`;
  const { data, error } = await createServiceRoleClient()
    .storage.from(STORAGE_BUCKETS.DOCUMENTS)
    .createSignedUploadUrl(path);

  if (error || !data?.token) {
    return { ok: false, error: error?.message ?? "Could not start the upload." };
  }
  return { ok: true, path: data.path, token: data.token };
}

export async function recordPortalDocument(input: {
  projectId: string;
  path: string;
  name: string;
  category: string;
  description?: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
}): Promise<Result<{ documentId: string }>> {
  const auth = await authorizePortfolioUpload(input.projectId);
  if (!auth.ok) return auth;

  if (!input.path.startsWith(`${input.projectId}/`)) {
    return { ok: false, error: "File does not belong to this project." };
  }
  const category = CATEGORIES.includes(input.category as DocumentCategory)
    ? (input.category as DocumentCategory)
    : "other";
  const name = input.name.trim().slice(0, 200) || input.fileName;
  const mimeType = PORTAL_DOCUMENT_MIME_TYPES.includes(input.mimeType)
    ? input.mimeType
    : "application/octet-stream";

  const documentId = randomUUID();
  const fullPayload: DocumentInsert = {
    id: documentId,
    project_id: input.projectId,
    name,
    category,
    storage_path: input.path,
    file_url: input.path,
    file_name: input.fileName,
    file_size: input.fileSize,
    mime_type: mimeType,
    folder_id: null,
    description: input.description?.trim() || null,
    document_group_id: documentId,
    version_number: 1,
    is_current: true,
    created_by: auth.userId,
  };

  const admin = createServiceRoleClient();
  let { error } = await admin.from("documents").insert(fullPayload);
  if (error && /document_group|version_number|is_current|schema cache/i.test(error.message)) {
    const {
      document_group_id: _g,
      version_number: _v,
      is_current: _c,
      ...corePayload
    } = fullPayload;
    ({ error } = await admin.from("documents").insert(corePayload));
  }
  if (error) {
    await admin.storage.from(STORAGE_BUCKETS.DOCUMENTS).remove([input.path]);
    return { ok: false, error: error.message };
  }

  revalidatePath("/dashboard/documents");
  revalidatePath(`/dashboard/projects/${input.projectId}`);
  revalidatePath("/admin/documents");
  return { ok: true, documentId };
}
