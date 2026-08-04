import { ActivityType } from "@prisma/client";
import { z } from "zod";

const emptyToUndefined = (value: unknown) =>
  value === "" || value === null || value === undefined ? undefined : value;

export const ACTIVITY_TYPES: ActivityType[] = [
  ActivityType.CALL,
  ActivityType.MEETING,
  ActivityType.EMAIL,
  ActivityType.TASK,
  ActivityType.NOTE,
];

export const MANUAL_ACTIVITY_TYPES: ActivityType[] = [
  ActivityType.CALL,
  ActivityType.MEETING,
  ActivityType.TASK,
  ActivityType.NOTE,
];

export const activityFormSchema = z.object({
  type: z.nativeEnum(ActivityType),
  title: z.string().trim().min(1, "Title is required").max(200),
  body: z.preprocess(emptyToUndefined, z.string().trim().optional()),
  leadId: z.preprocess(emptyToUndefined, z.string().uuid().optional()),
  occurredAt: z.string().min(1, "When is required"),
});

export type ActivityFormValues = z.infer<typeof activityFormSchema>;

export type ActivityFilter = "all" | ActivityType;
