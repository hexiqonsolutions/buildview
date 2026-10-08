import { z } from "zod";
import { DEFAULT_TRADE_NAMES } from "@/lib/timeline/admin-timeline";
import {
  LIMITS,
  fileName,
  int,
  isoDate,
  oneOf,
  optional,
  optionalText,
  optionalUuid,
  personName,
  storagePath,
  text,
  uuid,
} from "@/lib/validations/primitives";

export const MAX_TIMELINE_PHOTO_SIZE = 10 * 1024 * 1024; // 10 MB
export const MAX_TIMELINE_PHOTOS = 20;

const timelineStatuses = ["in_progress", "completed"] as const;

// Auto entries prefix upstream titles, e.g. "Document uploaded — <document name>".
const TIMELINE_TITLE_MAX = LIMITS.title + 100;

const tradeSchema = z
  .object({
    name: oneOf("Trade", DEFAULT_TRADE_NAMES),
    percent: int("Trade progress", { min: 0, max: 100 }),
    color: text("Trade color", {
      max: 40,
      pattern: /^bg-[a-z]+(?:-[0-9]{2,3})?$/,
    }).optional(),
  })
  .strict();

const tradesSchema = z
  .array(tradeSchema, { invalid_type_error: "Trades must be a list" })
  .max(8, "At most 8 trades allowed")
  .refine((trades) => new Set(trades.map((trade) => trade.name)).size === trades.length, {
    message: "Each trade can only be listed once",
  });

const whatsNewSchema = z
  .array(text("What's new item", { max: 200 }), { invalid_type_error: "What's new must be a list" })
  .max(8, "At most 8 what's new items allowed");

const isoTimestamp = z.string().datetime({ offset: true, local: true });

/** Calendar date (YYYY-MM-DD); a full ISO timestamp is accepted and reduced to its date. */
const eventDateSchema = z.preprocess(
  (value) =>
    typeof value === "string" && isoTimestamp.safeParse(value.trim()).success
      ? value.trim().slice(0, 10)
      : value,
  isoDate("Event date")
);

const timelinePhotoSchema = z
  .object({
    storage_path: storagePath("Photo location"),
    file_name: fileName("Photo file name"),
    caption: optionalText("Caption", { max: LIMITS.title }),
    sort_order: int("Photo order", { min: 0, max: 10_000 }).optional(),
  })
  .strict();

const timelinePhotosSchema = z
  .array(timelinePhotoSchema, { invalid_type_error: "Photos must be a list" })
  .max(MAX_TIMELINE_PHOTOS, `You can upload up to ${MAX_TIMELINE_PHOTOS} photos at a time.`);

export type TimelinePhotoData = z.infer<typeof timelinePhotoSchema>;

const authorNameSchema = optional(personName("Author", { max: LIMITS.shortText }));
const progressNoteSchema = optionalText("Progress note", { max: LIMITS.description, multiline: true });

export const createTimelineEventSchema = z
  .object({
    project_id: uuid("Project"),
    event_date: eventDateSchema,
    title: text("Title", { min: 2, max: TIMELINE_TITLE_MAX }),
    progress_note: progressNoteSchema,
    tour_id: optionalUuid("Virtual tour"),
    report_id: optionalUuid("Report"),
    sort_order: int("Sort order", { min: 0, max: 10_000 }).optional(),
    building: optionalText("Building", { max: LIMITS.shortText }),
    floor: optionalText("Floor", { max: LIMITS.shortText }),
    status: oneOf("Status", timelineStatuses).optional(),
    progress_percent: optional(int("Overall progress", { min: 0, max: 100 })),
    trades: tradesSchema.optional(),
    whats_new: whatsNewSchema.optional(),
    author_name: authorNameSchema,
    photos: timelinePhotosSchema.optional(),
    skipClientNotify: z.boolean().optional(),
  })
  .strict();

// `.optional()` keeps an omitted field as undefined (unchanged); null or "" clears it.
export const updateTimelineEventSchema = z
  .object({
    id: uuid("Timeline event"),
    event_date: eventDateSchema.optional(),
    title: text("Title", { min: 2, max: TIMELINE_TITLE_MAX }).optional(),
    progress_note: progressNoteSchema.optional(),
    tour_id: optionalUuid("Virtual tour").optional(),
    report_id: optionalUuid("Report").optional(),
    sort_order: int("Sort order", { min: 0, max: 10_000 }).optional(),
    status: oneOf("Status", timelineStatuses).optional(),
    progress_percent: optional(int("Overall progress", { min: 0, max: 100 })).optional(),
    trades: tradesSchema.optional(),
    whats_new: whatsNewSchema.optional(),
    author_name: authorNameSchema.optional(),
  })
  .strict();

export const addTimelinePhotosSchema = z
  .object({
    eventId: uuid("Timeline event"),
    photos: timelinePhotosSchema,
  })
  .strict();

const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/heic",
];

function validateTimelinePhotoFile(file: File): string | null {
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
