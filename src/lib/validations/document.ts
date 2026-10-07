import { z } from "zod";
import type { DocumentCategory } from "@/lib/types";
import {
  LIMITS,
  fileName,
  fileSize,
  mimeType,
  oneOf,
  optional,
  optionalText,
  optionalUuid,
  storagePath,
  text,
  uuid,
} from "./primitives";

const documentCategories = [
  "drawings",
  "boqs",
  "contracts",
  "approvals",
  "technical_documents",
  "other",
] as const satisfies readonly DocumentCategory[];

export const MAX_DOCUMENT_FILE_SIZE = 100 * 1024 * 1024; // 100 MB

const BLOCKED_EXTENSIONS = [".exe", ".bat", ".cmd", ".sh", ".ps1", ".msi"];

function hasBlockedExtension(name: string): boolean {
  const dot = name.lastIndexOf(".");
  return dot !== -1 && BLOCKED_EXTENSIONS.includes(name.slice(dot).toLowerCase());
}

const documentFileName = fileName().refine((name) => !hasBlockedExtension(name), {
  message: "This file type is not allowed.",
});

const documentStoragePath = storagePath("File upload").refine((path) => !hasBlockedExtension(path), {
  message: "This file type is not allowed.",
});

const spatialName = (label: string) => optionalText(label, { max: LIMITS.shortText });

/** Rejects storage paths that are not inside `<project_id>/`. */
export function requireProjectStoragePath(
  data: { project_id: string; storage_path: string },
  ctx: z.RefinementCtx
) {
  if (!data.storage_path.startsWith(`${data.project_id}/`)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["storage_path"],
      message: "File upload is outside the project folder",
    });
  }
}

export const createFolderSchema = z
  .object({
    project_id: uuid("Project"),
    name: text("Folder name", { max: 100 }),
    parent_id: optionalUuid("Parent folder"),
  })
  .strict();

const documentFields = {
  project_id: uuid("Project"),
  name: text("Document name", { max: LIMITS.fileName }),
  category: oneOf("Category", documentCategories),
  description: optionalText("Description", { max: LIMITS.description, multiline: true }),
  folder_id: optionalUuid("Folder"),
  storage_path: documentStoragePath,
  file_name: documentFileName,
  file_size: optional(fileSize("File size", { max: MAX_DOCUMENT_FILE_SIZE })),
  mime_type: optional(mimeType()),
  building: spatialName("Building"),
  floor: spatialName("Floor"),
};

export const createDocumentSchema = z
  .object(documentFields)
  .strict()
  .superRefine(requireProjectStoragePath);

export const createDocumentActionSchema = z
  .object({
    ...documentFields,
    skipClientNotify: z.boolean().optional(),
    skipTimeline: z.boolean().optional(),
  })
  .strict()
  .superRefine(requireProjectStoragePath);

export const replaceDocumentSchema = z
  .object({
    document_group_id: uuid("Document"),
    storage_path: documentStoragePath,
    file_name: documentFileName,
    file_size: optional(fileSize("File size", { max: MAX_DOCUMENT_FILE_SIZE })),
    mime_type: optional(mimeType()),
    change_note: optionalText("Change note", { max: LIMITS.description, multiline: true }),
  })
  .strict();

export type CreateFolderInput = z.infer<typeof createFolderSchema>;
export type CreateDocumentInput = z.infer<typeof createDocumentSchema>;

export function validateDocumentFile(file: File): string | null {
  if (file.size > MAX_DOCUMENT_FILE_SIZE) {
    return "File size must be under 100 MB.";
  }
  const ext = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
  if (BLOCKED_EXTENSIONS.includes(ext)) {
    return "This file type is not allowed.";
  }
  return null;
}
