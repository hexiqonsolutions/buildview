/** Matches the `documents` storage bucket limits (migration 003). */
export const PORTAL_DOCUMENT_MAX_BYTES = 100 * 1024 * 1024;

export const PORTAL_DOCUMENT_MIME_TYPES: string[] = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/zip",
  "application/x-zip-compressed",
  "text/plain",
  "application/octet-stream",
];

export const PORTAL_DOCUMENT_ACCEPT =
  ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.webp,.gif,.zip,.txt,.dwg,.dxf";

/** The bucket rejects unknown MIME types, so anything else is stored as a generic binary. */
export function portalDocumentContentType(file: File): string {
  return PORTAL_DOCUMENT_MIME_TYPES.includes(file.type) ? file.type : "application/octet-stream";
}

export function documentNameFromFile(fileName: string): string {
  return fileName.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim() || fileName;
}
