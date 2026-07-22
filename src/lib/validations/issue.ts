import { z } from "zod";

const issuePriorities = ["low", "medium", "high", "critical"] as const;
const issueStatuses = ["open", "in_progress", "resolved", "closed"] as const;

export const createIssueSchema = z.object({
  project_id: z.string().uuid("Please select a project"),
  title: z.string().min(2, "Title must be at least 2 characters"),
  description: z.string().optional(),
  priority: z.enum(issuePriorities),
  status: z.enum(issueStatuses).optional(),
  location: z.string().optional(),
  building: z.string().optional().nullable(),
  floor: z.string().optional().nullable(),
  assigned_to: z.string().uuid().optional().nullable(),
  due_date: z.string().optional().nullable(),
});

export const updateIssueSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(2).optional(),
  description: z.string().optional().nullable(),
  priority: z.enum(issuePriorities).optional(),
  status: z.enum(issueStatuses).optional(),
  location: z.string().optional().nullable(),
  assigned_to: z.string().uuid().optional().nullable(),
  due_date: z.string().optional().nullable(),
});

export const updateIssueStatusSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(issueStatuses),
});

export type CreateIssueInput = z.infer<typeof createIssueSchema>;
export type UpdateIssueInput = z.infer<typeof updateIssueSchema>;

export const MAX_ISSUE_IMAGE_SIZE = 10 * 1024 * 1024; // 10 MB
export const MAX_ISSUE_IMAGES = 10;

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
