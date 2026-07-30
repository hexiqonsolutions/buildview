import { z } from "zod";

export const createCommentSchema = z.object({
  project_id: z.string().uuid("A valid project is required"),
  message: z
    .string()
    .trim()
    .min(1, "Comment cannot be empty")
    .max(4000, "Comment is too long (max 4000 characters)"),
  /** Optional note context — prefixed into the message for visibility */
  context_type: z.enum(["project", "report", "document"]).optional(),
  context_label: z.string().trim().max(200).optional(),
  /** Reply to another comment in the same project (normalized to root thread) */
  parent_id: z.string().uuid().optional().nullable(),
});

export type CreateCommentInput = z.infer<typeof createCommentSchema>;

export const updateCommentStatusSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["open", "resolved"]),
});

export type UpdateCommentStatusInput = z.infer<typeof updateCommentStatusSchema>;
