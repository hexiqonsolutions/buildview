import { createClient } from "@/lib/supabase/client";
import { STORAGE_BUCKETS, type StorageBucket } from "@/lib/types";

export interface UploadResult {
  path: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
}

/** Sanitize filename for storage paths. */
export function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

/** Build a storage path: {projectId}/{timestamp}-{filename} */
export function buildStoragePath(projectId: string, fileName: string): string {
  return `${projectId}/${Date.now()}-${sanitizeFileName(fileName)}`;
}

/** Upload a file from the browser (Client Components). */
export async function uploadFileToStorage(
  bucket: StorageBucket,
  path: string,
  file: File
): Promise<UploadResult> {
  const supabase = createClient();

  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    contentType: file.type || "application/octet-stream",
    upsert: false,
  });

  if (error) throw new Error(error.message);

  return {
    path,
    fileName: file.name,
    fileSize: file.size,
    mimeType: file.type || "application/octet-stream",
  };
}

/** Build document storage path: {projectId}/{folderId|root}/{timestamp}-{filename} */
export function buildDocumentStoragePath(
  projectId: string,
  fileName: string,
  folderId?: string | null
): string {
  const folder = folderId ?? "root";
  return `${projectId}/${folder}/${Date.now()}-${sanitizeFileName(fileName)}`;
}

/** Upload a report PDF to the reports bucket. */
export async function uploadReportFile(
  projectId: string,
  file: File
): Promise<UploadResult> {
  const path = buildStoragePath(projectId, file.name);
  return uploadFileToStorage(STORAGE_BUCKETS.REPORTS, path, file);
}

/** Upload a document to the documents bucket. */
export async function uploadDocumentFile(
  projectId: string,
  file: File,
  folderId?: string | null
): Promise<UploadResult> {
  const path = buildDocumentStoragePath(projectId, file.name, folderId);
  return uploadFileToStorage(STORAGE_BUCKETS.DOCUMENTS, path, file);
}

/** Resolve storage path from a stored file reference. */
function resolveBucketStoragePath(
  storagePath: string | null | undefined,
  fileUrl: string | null | undefined,
  bucketName: string
): string | null {
  if (storagePath) return storagePath;
  if (!fileUrl) return null;

  const match = fileUrl.match(new RegExp(`/${bucketName}/(.+)$`));
  if (match?.[1]) return decodeURIComponent(match[1]);

  if (!fileUrl.startsWith("http")) return fileUrl;

  return null;
}

export function resolveStoragePath(
  storagePath: string | null | undefined,
  fileUrl: string | null | undefined
): string | null {
  return resolveBucketStoragePath(storagePath, fileUrl, "reports");
}

export function resolveDocumentStoragePath(
  storagePath: string | null | undefined,
  fileUrl: string | null | undefined
): string | null {
  return resolveBucketStoragePath(storagePath, fileUrl, "documents");
}

/** Build issue image path: {projectId}/{issueId}/{timestamp}-{filename} */
export function buildIssueImageStoragePath(
  projectId: string,
  issueId: string,
  fileName: string
): string {
  return `${projectId}/${issueId}/${Date.now()}-${sanitizeFileName(fileName)}`;
}

/** Upload an issue image to the issue-images bucket. */
export async function uploadIssueImageFile(
  projectId: string,
  issueId: string,
  file: File
): Promise<UploadResult> {
  const path = buildIssueImageStoragePath(projectId, issueId, file.name);
  return uploadFileToStorage(STORAGE_BUCKETS.ISSUE_IMAGES, path, file);
}

export function resolveIssueImageStoragePath(
  storagePath: string | null | undefined,
  fileUrl: string | null | undefined
): string | null {
  return resolveBucketStoragePath(storagePath, fileUrl, "issue-images");
}

/** Build timeline photo path: {projectId}/{eventId}/{timestamp}-{filename} */
export function buildTimelinePhotoStoragePath(
  projectId: string,
  eventId: string,
  fileName: string
): string {
  return `${projectId}/${eventId}/${Date.now()}-${sanitizeFileName(fileName)}`;
}

/** Upload a timeline photo to the timeline-photos bucket. */
export async function uploadTimelinePhotoFile(
  projectId: string,
  eventId: string,
  file: File
): Promise<UploadResult> {
  const path = buildTimelinePhotoStoragePath(projectId, eventId, file.name);
  return uploadFileToStorage(STORAGE_BUCKETS.TIMELINE_PHOTOS, path, file);
}

export function resolveTimelinePhotoStoragePath(
  storagePath: string | null | undefined,
  fileUrl: string | null | undefined
): string | null {
  return resolveBucketStoragePath(storagePath, fileUrl, "timeline-photos");
}

/** Build invoice PDF path: {clientId}/invoices/{invoiceId}/{timestamp}-{filename} */
export function buildInvoiceStoragePath(
  clientId: string,
  invoiceId: string,
  fileName: string
): string {
  return `${clientId}/invoices/${invoiceId}/${Date.now()}-${sanitizeFileName(fileName)}`;
}

/** Upload an invoice PDF to the documents bucket. */
export async function uploadInvoiceFile(
  clientId: string,
  invoiceId: string,
  file: File
): Promise<UploadResult> {
  const path = buildInvoiceStoragePath(clientId, invoiceId, file.name);
  return uploadFileToStorage(STORAGE_BUCKETS.DOCUMENTS, path, file);
}

export function resolveInvoiceStoragePath(
  storagePath: string | null | undefined,
  fileUrl: string | null | undefined
): string | null {
  return resolveBucketStoragePath(storagePath, fileUrl, "documents");
}
