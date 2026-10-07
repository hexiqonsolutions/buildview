import { z } from "zod";
import { DEFAULT_CURRENCY } from "@/lib/currency";
import { extractMatterportModelId } from "@/lib/matterport";
import {
  PORTAL_DOCUMENT_MAX_BYTES,
  PORTAL_DOCUMENT_MIME_TYPES,
  hasPortalDocumentExtension,
} from "@/lib/portal/document-upload";
import {
  DOCUMENT_CATEGORY_LABELS,
  ISSUE_PRIORITY_LABELS,
  REPORT_TYPE_LABELS,
  type DocumentCategory,
  type IssuePriority,
  type ReportType,
} from "@/lib/types";
import { MAX_DOCUMENT_FILE_SIZE } from "@/lib/validations/document";
import { MAX_ISSUE_IMAGES } from "@/lib/validations/issue";
import { MAX_REPORT_FILE_SIZE } from "@/lib/validations/report";
import { MAX_TIMELINE_PHOTOS } from "@/lib/validations/timeline";
import {
  LIMITS,
  fileName,
  fileSize,
  int,
  isoDate,
  mimeType,
  money,
  oneOf,
  optional,
  optionalText,
  storagePath,
  text,
  uuid,
} from "@/lib/validations/primitives";

export const DOCUMENT_CATEGORIES = Object.keys(DOCUMENT_CATEGORY_LABELS) as [
  DocumentCategory,
  ...DocumentCategory[],
];
export const REPORT_TYPES = Object.keys(REPORT_TYPE_LABELS) as [ReportType, ...ReportType[]];
export const ISSUE_PRIORITIES = Object.keys(ISSUE_PRIORITY_LABELS) as [
  IssuePriority,
  ...IssuePriority[],
];

/** Must match the (private) list in validateDocumentFile. */
export const DOCUMENT_BLOCKED_EXTENSIONS = [".exe", ".bat", ".cmd", ".sh", ".ps1", ".msi"];

/** Optional input that callers omit: undefined, null or "" all become `undefined`. */
export function omittable<T extends z.ZodTypeAny>(schema: T) {
  return optional(schema).transform((value) => (value ?? undefined) as z.output<T> | undefined);
}

export function omittableText(label: string, options: Parameters<typeof optionalText>[1]) {
  return optionalText(label, options).transform((value) => value ?? undefined);
}

function extensionOf(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot === -1 ? "" : name.slice(dot).toLowerCase();
}

/** True when `path` is a single object directly inside `folder` (which ends with "/"). */
export function isDirectChildPath(path: string, folder: string): boolean {
  return (
    path.startsWith(folder) && path.length > folder.length && !path.slice(folder.length).includes("/")
  );
}

function addIssue(ctx: z.RefinementCtx, path: (string | number)[], message: string) {
  ctx.addIssue({ code: z.ZodIssueCode.custom, path, message });
}

const projectId = () => uuid("Project");
const titleText = (label: string, min = 2) => text(label, { min, max: LIMITS.title });
const noteText = (label: string) =>
  omittableText(label, { max: LIMITS.description, multiline: true });
const placeText = (label: string) => omittableText(label, { max: LIMITS.shortText });

const matterportUrl = text("Tour share URL", { max: LIMITS.url }).refine(
  (value) => /^[A-Za-z0-9]+$/.test(extractMatterportModelId(value) ?? ""),
  { message: "Enter a valid 360° tour share URL." }
);

const documentFileName = fileName().refine(
  (value) => !DOCUMENT_BLOCKED_EXTENSIONS.includes(extensionOf(value)),
  { message: "This file type is not allowed." }
);

export const uploadMatterportSchema = z
  .object({
    project_id: projectId(),
    name: titleText("Tour name"),
    matterport_url: matterportUrl,
    capture_date: omittable(isoDate("Capture date")),
    building: placeText("Building"),
    floor: placeText("Floor"),
    building_id: omittable(uuid("Building")),
    floor_id: omittable(uuid("Floor")),
    engineer: omittableText("Engineer", { max: LIMITS.name }),
    progress_note: noteText("Progress note"),
  })
  .strict();

export const uploadReportSchema = z
  .object({
    project_id: projectId(),
    title: titleText("Title"),
    report_type: oneOf("Report type", REPORT_TYPES),
    report_date: isoDate("Report date"),
    storage_path: storagePath("File path"),
    file_name: fileName(),
    file_size: omittable(fileSize("File size", { max: MAX_REPORT_FILE_SIZE })),
    mime_type: omittable(
      mimeType().refine((value) => value === "application/pdf", {
        message: "Only PDF files are allowed.",
      })
    ),
    description: noteText("Description"),
    building: placeText("Building"),
    floor: placeText("Floor"),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (!isDirectChildPath(value.storage_path, `${value.project_id}/`)) {
      addIssue(ctx, ["storage_path"], "File does not belong to this project.");
    }
  });

export const uploadDocumentSchema = z
  .object({
    project_id: projectId(),
    name: titleText("Document name", 1),
    category: oneOf("Category", DOCUMENT_CATEGORIES),
    storage_path: storagePath("File path"),
    file_name: documentFileName,
    file_size: omittable(fileSize("File size", { max: MAX_DOCUMENT_FILE_SIZE })),
    mime_type: omittable(mimeType()),
    folder_id: omittable(uuid("Folder")),
    description: noteText("Description"),
    event_date: omittable(isoDate("Date")),
    building: placeText("Building"),
    floor: placeText("Floor"),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (!isDirectChildPath(value.storage_path, `${value.project_id}/${value.folder_id ?? "root"}/`)) {
      addIssue(ctx, ["storage_path"], "File does not belong to this project.");
    }
  });

const invoiceNumber = text("Invoice number", { max: LIMITS.title });

export const beginInvoiceUploadSchema = z
  .object({
    project_id: projectId(),
    client_id: uuid("Client"),
    invoice_number: invoiceNumber,
    amount: omittable(money("Amount")),
    currency: omittable(oneOf("Currency", [DEFAULT_CURRENCY])),
    description: noteText("Description"),
  })
  .strict();

/** `{clientId}/invoices/{invoiceId}/{file}` as built by buildInvoiceStoragePath. */
function isInvoiceFilePath(path: string, invoiceId: string): boolean {
  const [clientId, folder, id, name, ...rest] = path.split("/");
  return (
    rest.length === 0 &&
    uuid().safeParse(clientId).success &&
    folder === "invoices" &&
    id === invoiceId &&
    Boolean(name) &&
    !DOCUMENT_BLOCKED_EXTENSIONS.includes(extensionOf(name))
  );
}

export const finalizeInvoiceUploadSchema = z
  .object({
    invoice_id: uuid("Invoice"),
    project_id: projectId(),
    invoice_number: invoiceNumber,
    storage_path: storagePath("File path"),
    description: noteText("Description"),
    event_date: omittable(isoDate("Date")),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (!isInvoiceFilePath(value.storage_path, value.invoice_id)) {
      addIssue(ctx, ["storage_path"], "File does not belong to this invoice.");
    }
  });

export const uploadTimelineUpdateSchema = z
  .object({
    project_id: projectId(),
    title: titleText("Title"),
    event_date: isoDate("Event date"),
    progress_note: noteText("Progress note"),
    progress_percent: omittable(int("Overall progress", { min: 0, max: 100 })),
    engineer: omittableText("Engineer", { max: LIMITS.name }),
    building: placeText("Building"),
    floor: placeText("Floor"),
    tour_id: omittable(uuid("Tour")),
    report_id: omittable(uuid("Report")),
    skipClientNotify: z.boolean({ invalid_type_error: "skipClientNotify must be true or false" }).optional(),
  })
  .strict();

const sitePhotoSchema = z
  .object({
    storage_path: storagePath("Photo path"),
    file_name: fileName("Photo file name"),
    caption: omittableText("Caption", { max: LIMITS.fileName }),
  })
  .strict();

const sitePhotosSchema = z
  .array(sitePhotoSchema, { invalid_type_error: "Photos must be a list" })
  .min(1, "Select at least one photo.")
  .max(MAX_TIMELINE_PHOTOS, `You can upload up to ${MAX_TIMELINE_PHOTOS} photos at a time.`)
  .refine((photos) => new Set(photos.map((photo) => photo.storage_path)).size === photos.length, {
    message: "Each photo can only be added once.",
  });

function refinePhotoFolder(
  photos: { storage_path: string }[],
  folder: string,
  ctx: z.RefinementCtx,
  exact: boolean
) {
  photos.forEach((photo, index) => {
    const inside = exact
      ? isDirectChildPath(photo.storage_path, folder)
      : photo.storage_path.startsWith(folder);
    if (!inside) addIssue(ctx, ["photos", index, "storage_path"], "Photo does not belong to this upload.");
  });
}

export const attachSitePhotosSchema = z
  .object({
    project_id: projectId(),
    event_id: uuid("Timeline event"),
    title: titleText("Title"),
    photos: sitePhotosSchema,
    building: placeText("Building"),
    floor: placeText("Floor"),
  })
  .strict()
  .superRefine((value, ctx) => {
    refinePhotoFolder(value.photos, `${value.project_id}/${value.event_id}/`, ctx, true);
  });

export const uploadSitePhotosSchema = z
  .object({
    project_id: projectId(),
    title: titleText("Title"),
    event_date: isoDate("Event date"),
    photos: sitePhotosSchema,
    progress_note: noteText("Progress note"),
    building: placeText("Building"),
    floor: placeText("Floor"),
  })
  .strict()
  .superRefine((value, ctx) => {
    refinePhotoFolder(value.photos, `${value.project_id}/`, ctx, false);
  });

const issueImageSchema = z
  .object({
    storage_path: storagePath("Image path"),
    file_name: fileName("Image file name"),
    caption: omittableText("Caption", { max: LIMITS.fileName }),
    sort_order: omittable(int("Sort order", { min: 0, max: MAX_ISSUE_IMAGES - 1 })),
  })
  .strict();

export const uploadIssueSchema = z
  .object({
    project_id: projectId(),
    title: titleText("Issue title"),
    description: noteText("Description"),
    priority: oneOf("Priority", ISSUE_PRIORITIES),
    location: omittableText("Location", { max: LIMITS.title }),
    building: placeText("Building"),
    floor: placeText("Floor"),
    event_date: omittable(isoDate("Date")),
    images: z
      .array(issueImageSchema, { invalid_type_error: "Images must be a list" })
      .max(MAX_ISSUE_IMAGES, `You can upload up to ${MAX_ISSUE_IMAGES} images per issue.`)
      .optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    value.images?.forEach((image, index) => {
      if (!image.storage_path.startsWith(`${value.project_id}/`)) {
        addIssue(ctx, ["images", index, "storage_path"], "Image does not belong to this project.");
      }
    });
  });

const portalDocumentFileName = fileName().refine(hasPortalDocumentExtension, {
  message: "This file type is not supported.",
});
const portalDocumentFileSize = fileSize("File size", { max: PORTAL_DOCUMENT_MAX_BYTES });

export const portalDocumentUploadUrlSchema = z
  .object({
    projectId: projectId(),
    fileName: portalDocumentFileName,
    fileSize: portalDocumentFileSize,
  })
  .strict();

export const recordPortalDocumentSchema = z
  .object({
    projectId: projectId(),
    path: storagePath("File path"),
    name: titleText("Document name", 1),
    category: oneOf("Category", DOCUMENT_CATEGORIES),
    description: optionalText("Note", { max: LIMITS.description, multiline: true }),
    fileName: portalDocumentFileName,
    fileSize: portalDocumentFileSize,
    mimeType: mimeType().refine((value) => PORTAL_DOCUMENT_MIME_TYPES.includes(value), {
      message: "This file type is not supported.",
    }),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (!isDirectChildPath(value.path, `${value.projectId}/root/`)) {
      addIssue(ctx, ["path"], "File does not belong to this project.");
    }
  });
