import { z } from "zod";
import type { IssuePriority, IssueStatus } from "@/lib/types";
import {
  LIMITS,
  fileName,
  int,
  oneOf,
  optionalIsoDate,
  optionalText,
  optionalUuid,
  storagePath,
  text,
  uuid,
  uuidList,
} from "@/lib/validations/primitives";

const issuePriorities = ["low", "medium", "high", "critical"] as const satisfies readonly IssuePriority[];
const issueStatuses = ["open", "in_progress", "resolved", "closed"] as const satisfies readonly IssueStatus[];

export const MAX_ISSUE_IMAGE_SIZE = 10 * 1024 * 1024; // 10 MB
export const MAX_ISSUE_IMAGES = 10;

const issueImageSchema = z
  .object({
    storage_path: storagePath("Photo location"),
    file_name: fileName("Photo file name"),
    caption: optionalText("Caption", { max: LIMITS.title }),
    sort_order: int("Photo order", { min: 0, max: 10_000 }).optional(),
  })
  .strict();

const issueImagesSchema = z
  .array(issueImageSchema, { invalid_type_error: "Photos must be a list" })
  .max(MAX_ISSUE_IMAGES, `You can upload up to ${MAX_ISSUE_IMAGES} images at a time.`);

const createIssueFields = z.object({
  project_id: uuid("Project"),
  title: text("Title", { min: 2, max: LIMITS.title }),
  description: optionalText("Description", { max: LIMITS.description, multiline: true }),
  priority: oneOf("Priority", issuePriorities),
  status: oneOf("Status", issueStatuses).optional(),
  location: optionalText("Location", { max: LIMITS.title }),
  building: optionalText("Building", { max: LIMITS.shortText }),
  floor: optionalText("Floor", { max: LIMITS.shortText }),
  assigned_to: optionalUuid("Assignee"),
  due_date: optionalIsoDate("Due date"),
  images: issueImagesSchema.optional(),
});

/** Photos attached at creation must live under the issue's project folder. */
function imagesWithinProject(
  data: { project_id: string; images?: Array<{ storage_path: string }> },
  ctx: z.RefinementCtx
) {
  const prefix = `${data.project_id}/`;
  data.images?.forEach((image, index) => {
    if (!image.storage_path.startsWith(prefix)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["images", index, "storage_path"],
        message: "Invalid photo location for this project.",
      });
    }
  });
}

export const createIssueSchema = createIssueFields.strict().superRefine(imagesWithinProject);

/** `createIssue` server action input: issue fields plus caller-only flags. */
export const createIssueActionSchema = createIssueFields
  .extend({
    skipClientNotify: z.boolean().optional(),
    skipTimeline: z.boolean().optional(),
  })
  .strict()
  .superRefine(imagesWithinProject);

// `.optional()` keeps an omitted field as undefined (unchanged); null or "" clears it.
export const updateIssueSchema = z
  .object({
    id: uuid("Issue"),
    title: text("Title", { min: 2, max: LIMITS.title }).optional(),
    description: optionalText("Description", { max: LIMITS.description, multiline: true }).optional(),
    priority: oneOf("Priority", issuePriorities).optional(),
    status: oneOf("Status", issueStatuses).optional(),
    location: optionalText("Location", { max: LIMITS.title }).optional(),
    assigned_to: optionalUuid("Assignee").optional(),
    due_date: optionalIsoDate("Due date").optional(),
  })
  .strict();

export const updateIssueStatusSchema = z
  .object({
    id: uuid("Issue"),
    status: oneOf("Status", issueStatuses),
  })
  .strict();

export const addIssueImagesSchema = z
  .object({
    issueId: uuid("Issue"),
    images: issueImagesSchema,
  })
  .strict();

export const issueImageIdsSchema = uuidList("Image IDs", { max: 100 });

export type CreateIssueInput = z.infer<typeof createIssueSchema>;
export type UpdateIssueInput = z.infer<typeof updateIssueSchema>;

const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/heic",
];

export function validateIssueImageFile(file: File): string | null {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return "Only JPEG, PNG, WebP, GIF, or HEIC images are allowed.";
  }
  if (file.size > MAX_ISSUE_IMAGE_SIZE) {
    return "Each image must be under 10 MB.";
  }
  return null;
}

export function validateIssueImageFiles(files: File[]): string | null {
  if (files.length > MAX_ISSUE_IMAGES) {
    return `You can upload up to ${MAX_ISSUE_IMAGES} images per issue.`;
  }
  for (const file of files) {
    const error = validateIssueImageFile(file);
    if (error) return error;
  }
  return null;
}
