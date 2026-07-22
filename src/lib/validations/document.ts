import { z } from "zod";

const documentCategories = [
  "drawings",
  "boqs",
  "contracts",
  "approvals",
  "technical_documents",
  "other",
] as const;

export const createFolderSchema = z.object({
  project_id: z.string().uuid("Please select a project"),
  name: z.string().min(1, "Folder name is required").max(100),
  parent_id: z.string().uuid().optional().nullable(),
});

export const createDocumentSchema = z.object({
  project_id: z.string().uuid("Please select a project"),
  name: z.string().min(1, "Document name is required"),
  category: z.enum(documentCategories),
  description: z.string().optional(),
  folder_id: z.string().uuid().optional().nullable(),
  storage_path: z.string().min(1),
  file_name: z.string().min(1),
  file_size: z.number().positive().optional(),
  mime_type: z.string().optional(),
  building: z.string().optional().nullable(),
  floor: z.string().optional().nullable(),
});

export const replaceDocumentSchema = z.object({
  document_group_id: z.string().uuid(),
  storage_path: z.string().min(1),
  file_name: z.string().min(1),
  file_size: z.number().positive().optional(),
  mime_type: z.string().optional(),
  change_note: z.string().optional(),
});

export type CreateFolderInput = z.infer<typeof createFolderSchema>;
export type CreateDocumentInput = z.infer<typeof createDocumentSchema>;

export const MAX_DOCUMENT_FILE_SIZE = 100 * 1024 * 1024; // 100 MB

const BLOCKED_EXTENSIONS = [".exe", ".bat", ".cmd", ".sh", ".ps1", ".msi"];

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
