import { z } from "zod";

export const createCommentSchema = z.object({
  project_id: z.string().uuid("A valid project is required"),
  message: z
    .string()
    .trim()
    .min(1, "Comment cannot be empty")
    .max(4000, "Comment is too long (max 4000 characters)"),
});

export type CreateCommentInput = z.infer<typeof createCommentSchema>;

export const updateCommentStatusSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["open", "resolved"]),
});

export type UpdateCommentStatusInput = z.infer<typeof updateCommentStatusSchema>;
