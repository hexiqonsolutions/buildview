import { z } from "zod";

const tradeSchema = z.object({
  name: z.string().min(1).max(80),
  percent: z.number().int().min(0).max(100),
  color: z.string().optional(),
});

export const createTimelineEventSchema = z.object({
  project_id: z.string().uuid("Please select a project"),
  event_date: z.string().min(1, "Event date is required"),
  title: z.string().min(2, "Title must be at least 2 characters"),
  progress_note: z.string().optional(),
  tour_id: z.string().uuid().optional().nullable(),
  report_id: z.string().uuid().optional().nullable(),
  sort_order: z.number().int().min(0).optional(),
  building: z.string().optional().nullable(),
  floor: z.string().optional().nullable(),
  status: z.enum(["in_progress", "completed"]).optional(),
  progress_percent: z.number().int().min(0).max(100).optional().nullable(),
  trades: z.array(tradeSchema).max(8).optional(),
  whats_new: z.array(z.string().min(1).max(200)).max(8).optional(),
  author_name: z.string().max(120).optional().nullable(),
});

export const updateTimelineEventSchema = z.object({
  id: z.string().uuid(),
  event_date: z.string().optional(),
  title: z.string().min(2).optional(),
  progress_note: z.string().optional().nullable(),
  tour_id: z.string().uuid().optional().nullable(),
  report_id: z.string().uuid().optional().nullable(),
  sort_order: z.number().int().min(0).optional(),
  status: z.enum(["in_progress", "completed"]).optional(),
  progress_percent: z.number().int().min(0).max(100).optional().nullable(),
  trades: z.array(tradeSchema).max(8).optional(),
  whats_new: z.array(z.string().min(1).max(200)).max(8).optional(),
  author_name: z.string().max(120).optional().nullable(),
});

export type CreateTimelineEventInput = z.infer<typeof createTimelineEventSchema>;

export const MAX_TIMELINE_PHOTO_SIZE = 10 * 1024 * 1024; // 10 MB
export const MAX_TIMELINE_PHOTOS = 20;

const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/heic",
];

export function validateTimelinePhotoFile(file: File): string | null {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return "Only JPEG, PNG, WebP, GIF, or HEIC images are allowed.";
  }
  if (file.size > MAX_TIMELINE_PHOTO_SIZE) {
    return "Each photo must be under 10 MB.";
  }
  return null;
}

export function validateTimelinePhotoFiles(files: File[]): string | null {
  if (files.length > MAX_TIMELINE_PHOTOS) {
    return `You can upload up to ${MAX_TIMELINE_PHOTOS} photos per event.`;
  }
  for (const file of files) {
    const error = validateTimelinePhotoFile(file);
    if (error) return error;
  }
  return null;
}
