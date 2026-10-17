import { z } from "zod";
import { isoDate, optionalText, uuid } from "@/lib/validations/primitives";

export const setProgressionStepSchema = z
  .object({
    projectId: uuid("Project ID"),
    stepId: uuid("Step ID"),
    completed: z.boolean(),
    workDate: isoDate("Work date"),
    note: optionalText("Note", { max: 500, multiline: true }),
  })
  .strict();

export type SetProgressionStepInput = z.infer<typeof setProgressionStepSchema>;
