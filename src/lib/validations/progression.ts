import { z } from "zod";
import { isoDate, optionalText, uuid } from "@/lib/validations/primitives";

export const progressionTrackSchema = z.enum(["pre_slab", "post_slab"]);

const selections = {
  preFloorId: uuid("Pre-Slab floor ID").optional(),
  postFloorId: uuid("Post-Slab floor ID").optional(),
};

export const progressionStepActionSchema = z
  .object({
    projectId: uuid("Project ID"),
    floorId: uuid("Floor ID"),
    track: progressionTrackSchema,
    stepId: uuid("Step ID"),
    ...selections,
  })
  .strict();

export type ProgressionStepActionInput = z.infer<typeof progressionStepActionSchema>;

export const updateProgressionStepDatesSchema = z
  .object({
    projectId: uuid("Project ID"),
    floorId: uuid("Floor ID"),
    track: progressionTrackSchema,
    stepId: uuid("Step ID"),
    startedAt: z.string().datetime({ offset: true }).nullable(),
    endedAt: z.string().datetime({ offset: true }).nullable(),
    ...selections,
  })
  .strict()
  .refine(
    (v) =>
      !v.startedAt || !v.endedAt || new Date(v.endedAt) >= new Date(v.startedAt),
    { message: "End date must be after Start date." }
  );

export type UpdateProgressionStepDatesInput = z.infer<
  typeof updateProgressionStepDatesSchema
>;

export const selectProgressionSectionSchema = z
  .object({
    projectId: uuid("Project ID"),
    track: progressionTrackSchema,
    floorId: uuid("Floor ID"),
    ...selections,
  })
  .strict();

export type SelectProgressionSectionInput = z.infer<
  typeof selectProgressionSectionSchema
>;

/** Legacy tick schema (kept for compatibility; UI uses Start/End actions). */
export const setProgressionStepSchema = z
  .object({
    projectId: uuid("Project ID"),
    floorId: uuid("Floor ID"),
    stepId: uuid("Step ID"),
    completed: z.boolean(),
    workDate: isoDate("Work date"),
    note: optionalText("Note", { max: 500, multiline: true }),
  })
  .strict();

export type SetProgressionStepInput = z.infer<typeof setProgressionStepSchema>;
