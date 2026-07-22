import { z } from "zod";

const reportTypes = [
  "progress_report",
  "quality_report",
  "inspection_report",
  "safety_report",
] as const;

export const createReportSchema = z.object({
  project_id: z.string().uuid("Please select a project"),
  title: z.string().min(2, "Title must be at least 2 characters"),
  report_type: z.enum(reportTypes),
  report_date: z.string().min(1, "Report date is required"),
  description: z.string().optional(),
  storage_path: z.string().min(1, "File upload is required"),
  file_name: z.string().min(1),
  file_size: z.number().positive().optional(),
  mime_type: z.string().optional(),
  building: z.string().optional().nullable(),
  floor: z.string().optional().nullable(),
});

export type CreateReportInput = z.infer<typeof createReportSchema>;

export const MAX_REPORT_FILE_SIZE = 50 * 1024 * 1024; // 50 MB

export function validateReportFile(file: File): string | null {
  if (file.type !== "application/pdf") {
    return "Only PDF files are allowed.";
  }
  if (file.size > MAX_REPORT_FILE_SIZE) {
    return "File size must be under 50 MB.";
  }
  return null;
}
