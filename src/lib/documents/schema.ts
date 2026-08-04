import { DocumentType } from "@prisma/client";
import { z } from "zod";

const emptyToUndefined = (value: unknown) =>
  value === "" || value === null || value === undefined ? undefined : value;

export const DOCUMENT_TYPES: DocumentType[] = [
  DocumentType.PDF,
  DocumentType.PROPOSAL,
  DocumentType.QUOTATION,
  DocumentType.CONTRACT,
  DocumentType.INVOICE,
  DocumentType.IMAGE,
  DocumentType.OTHER,
];

export const MAX_DOCUMENT_BYTES = 25 * 1024 * 1024;

export const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
  "text/csv",
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
]);

export const documentMetaSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  type: z.nativeEnum(DocumentType),
  leadId: z.preprocess(emptyToUndefined, z.string().uuid().optional()),
});

export type DocumentMetaValues = z.infer<typeof documentMetaSchema>;

export type DocumentFilter = "all" | DocumentType;

export function inferDocumentType(
  mimeType: string,
  explicit?: DocumentType
): DocumentType {
  if (explicit) return explicit;
  if (mimeType === "application/pdf") return DocumentType.PDF;
  if (mimeType.startsWith("image/")) return DocumentType.IMAGE;
  return DocumentType.OTHER;
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
