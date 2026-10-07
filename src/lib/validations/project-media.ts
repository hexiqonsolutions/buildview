import { z } from "zod";
import { PROJECT_MEDIA_MAX_BYTES, PROJECT_MEDIA_MIME_TYPES } from "@/lib/project-media";
import type { ProjectMediaType } from "@/lib/types";
import {
  LIMITS,
  fileName,
  fileSize,
  mimeType,
  oneOf,
  storagePath,
  text,
  uuid,
} from "@/lib/validations/primitives";
import { isDirectChildPath } from "@/lib/validations/upload";

export const PROJECT_MEDIA_TYPES = Object.keys(PROJECT_MEDIA_MIME_TYPES) as [
  ProjectMediaType,
  ...ProjectMediaType[],
];

export const projectMediaProjectIdSchema = uuid("Project");
export const projectMediaIdSchema = uuid("Media ID");
export const projectMediaTitleSchema = text("Title", { max: LIMITS.title });
export const projectMediaDirectionSchema = oneOf("Direction", ["up", "down"]);

export const addProjectMediaSchema = z
  .object({
    project_id: projectMediaProjectIdSchema,
    media_type: oneOf("Media type", PROJECT_MEDIA_TYPES),
    title: projectMediaTitleSchema,
    storage_path: storagePath("File path"),
    file_name: fileName(),
    mime_type: mimeType(),
    file_size: fileSize("File size", { max: Math.max(...Object.values(PROJECT_MEDIA_MAX_BYTES)) }),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (!PROJECT_MEDIA_MIME_TYPES[value.media_type].includes(value.mime_type)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["mime_type"],
        message: "This file type is not allowed here.",
      });
    }
    const maxBytes = PROJECT_MEDIA_MAX_BYTES[value.media_type];
    if (value.file_size > maxBytes) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["file_size"],
        message: `File must be at most ${Math.round(maxBytes / 1024 / 1024)} MB`,
      });
    }
    if (!isDirectChildPath(value.storage_path, `${value.project_id}/`)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["storage_path"],
        message: "File path does not belong to this project.",
      });
    }
  });
