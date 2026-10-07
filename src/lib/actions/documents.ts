"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createSignedStorageUrl } from "@/lib/supabase/storage-server";
import { assertCanUploadToProject } from "@/lib/auth/upload-access";
import { resolveDocumentStoragePath } from "@/lib/supabase/storage";
import { replaceDocumentSchema } from "@/lib/validations/document";
import { parseOrThrow, validate } from "@/lib/validations/parse";
import {
  documentGroupIdSchema,
  documentIdSchema,
  replaceDocumentVersionSchema,
} from "@/lib/validations/data";
import type { Document, DocumentInsert } from "@/lib/types";
import { STORAGE_BUCKETS } from "@/lib/types";
import { PublicError } from "@/lib/errors/public";
import { internalError } from "@/lib/errors/server";

/** Generate a signed URL for downloading a document. */
export async function getDocumentSignedUrl(
  documentId: string
): Promise<{ url: string; fileName: string }> {
  const id = parseOrThrow(documentIdSchema, documentId);
  const supabase = await createClient();

  const { data: document, error } = await supabase
    .from("documents")
    .select("storage_path, file_url, file_name")
    .eq("id", id)
    .is("deleted_at", null)
    .single();

  if (error || !document) {
    throw new PublicError("Document not found");
  }

  const path = resolveDocumentStoragePath(
    document.storage_path,
    document.file_url
  );

  if (!path) {
    if (document.file_url?.startsWith("http")) {
      return { url: document.file_url, fileName: document.file_name };
    }
    throw new PublicError("File not found.");
  }

  const url = await createSignedStorageUrl(STORAGE_BUCKETS.DOCUMENTS, path);
  return { url, fileName: document.file_name };
}

export async function getDocumentVersionHistory(
  documentGroupId: string
): Promise<Document[]> {
  const parsedGroupId = validate(documentGroupIdSchema, documentGroupId);
  if (!parsedGroupId.success) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("documents")
    .select("*")
    .eq("document_group_id", parsedGroupId.data)
    .is("deleted_at", null)
    .order("version_number", { ascending: false });

  if (error) throw internalError("getDocumentVersionHistory", error);
  return (data ?? []) as Document[];
}

export async function replaceDocumentVersion(data: {
  document_group_id: string;
  storage_path: string;
  file_name: string;
  file_size?: number;
  mime_type?: string;
  change_note?: string;
}): Promise<string> {
  parseOrThrow(replaceDocumentVersionSchema, data);
  const validation = replaceDocumentSchema.safeParse(data);
  if (!validation.success) {
    throw new PublicError(validation.error.errors[0]?.message ?? "Invalid replace data");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: current, error: currentError } = await supabase
    .from("documents")
    .select("*")
    .eq("document_group_id", validation.data.document_group_id)
    .eq("is_current", true)
    .is("deleted_at", null)
    .single();

  if (currentError || !current) {
    throw new PublicError("Current document version not found");
  }

  await assertCanUploadToProject(current.project_id, "documents");

  if (!validation.data.storage_path.startsWith(`${current.project_id}/`)) {
    throw new PublicError("This file cannot be replaced from here.");
  }

  const nextVersion = (current.version_number ?? 1) + 1;
  const newId = randomUUID();

  const { error: retireError } = await supabase
    .from("documents")
    .update({ is_current: false, updated_by: user?.id ?? null })
    .eq("id", current.id);

  if (retireError) throw internalError("replaceDocumentVersion", retireError);

  const payload: DocumentInsert = {
    id: newId,
    project_id: current.project_id,
    folder_id: current.folder_id,
    name: current.name,
    category: current.category,
    description: validation.data.change_note ?? current.description,
    file_url: validation.data.storage_path,
    file_name: validation.data.file_name,
    file_size: validation.data.file_size ?? null,
    mime_type: validation.data.mime_type ?? current.mime_type,
    storage_path: validation.data.storage_path,
    building: current.building,
    floor: current.floor,
    building_id: current.building_id ?? null,
    floor_id: current.floor_id ?? null,
    document_group_id: current.document_group_id ?? current.id,
    version_number: nextVersion,
    is_current: true,
    created_by: user?.id ?? null,
  };

  const { error: insertError } = await supabase.from("documents").insert(payload);
  if (insertError) throw internalError("replaceDocumentVersion", insertError);

  revalidatePath("/admin/documents");
  revalidatePath("/dashboard/documents");
  revalidatePath(`/dashboard/projects/${current.project_id}`);

  return newId;
}
