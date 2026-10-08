import { z } from "zod";
import type { ReportType } from "@/lib/types";
import { requireProjectStoragePath } from "./document";
import {
  LIMITS,
  fileName,
  fileSize,
  isoDate,
  oneOf,
  optional,
  optionalText,
  storagePath,
  text,
  uuid,
} from "./primitives";

const reportTypes = [
  "progress_report",
  "quality_report",
  "inspection_report",
  "safety_report",
] as const satisfies readonly ReportType[];

export const MAX_REPORT_FILE_SIZE = 50 * 1024 * 1024; // 50 MB

const REPORT_MIME_TYPES = ["application/pdf"] as const;

const reportFields = {
  project_id: uuid("Project"),
  title: text("Title", { min: 2, max: LIMITS.fileName }),
  report_type: oneOf("Report type", reportTypes),
  report_date: isoDate("Report date"),
  description: optionalText("Description", { max: LIMITS.description, multiline: true }),
  storage_path: storagePath("File upload").refine((path) => path.toLowerCase().endsWith(".pdf"), {
    message: "Only PDF files are allowed.",
  }),
  file_name: fileName(),
  file_size: optional(fileSize("File size", { max: MAX_REPORT_FILE_SIZE })),
  mime_type: optional(oneOf("File type", REPORT_MIME_TYPES)),
  building: optionalText("Building", { max: LIMITS.shortText }),
  floor: optionalText("Floor", { max: LIMITS.shortText }),
};

export const createReportSchema = z
  .object(reportFields)
  .strict()
  .superRefine(requireProjectStoragePath);

export const createReportActionSchema = z
  .object({
    ...reportFields,
    skipClientNotify: z.boolean().optional(),
    skipTimeline: z.boolean().optional(),
  })
  .strict()
  .superRefine(requireProjectStoragePath);

export function validateReportFile(file: File): string | null {
  if (file.type !== "application/pdf") {
    return "Only PDF files are allowed.";
  }
  if (file.size > MAX_REPORT_FILE_SIZE) {
    return "File size must be under 50 MB.";
  }
  return null;
}
