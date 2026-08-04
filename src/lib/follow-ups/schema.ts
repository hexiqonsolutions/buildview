import { FollowUpStatus } from "@prisma/client";
import { z } from "zod";

const emptyToUndefined = (value: unknown) =>
  value === "" || value === null || value === undefined ? undefined : value;

export const followUpFormSchema = z.object({
  leadId: z.string().uuid("Select a lead"),
  title: z.string().trim().min(1, "Title is required").max(200),
  notes: z.preprocess(emptyToUndefined, z.string().trim().optional()),
  dueAt: z.string().min(1, "Due date is required"),
  assigneeId: z.preprocess(emptyToUndefined, z.string().uuid().optional()),
});

export const followUpStatusSchema = z.object({
  id: z.string().uuid(),
  status: z.nativeEnum(FollowUpStatus),
});

export type FollowUpFormValues = z.infer<typeof followUpFormSchema>;

export type FollowUpBucket = "today" | "upcoming" | "overdue" | "done" | "all";
