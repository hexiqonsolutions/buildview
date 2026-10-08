import { z } from "zod";
import type { CommentStatus } from "@/lib/types";
import { LIMITS, oneOf, optionalText, optionalUuid, text, uuid } from "@/lib/validations/primitives";

const commentStatuses = ["open", "resolved"] as const satisfies readonly CommentStatus[];

export const createCommentSchema = z
  .object({
    project_id: uuid("Project"),
    message: text("Comment", { max: 4000, multiline: true }),
    /** Optional note context — prefixed into the message for visibility */
    context_type: oneOf("Comment context", ["project", "report", "document"]).optional(),
    context_label: optionalText("Context label", { max: LIMITS.fileName }),
    /** Reply to another comment in the same project (normalized to root thread) */
    parent_id: optionalUuid("Parent comment"),
  })
  .strict();

export const updateCommentStatusSchema = z
  .object({
    id: uuid("Comment"),
    status: oneOf("Status", commentStatuses),
  })
  .strict();

export const commentIdSchema = uuid("Comment");
export const commentProjectIdSchema = uuid("Project");
