import { z } from "zod";
import { money, optional, optionalText, text, uuid } from "@/lib/validations/primitives";

const projectId = uuid("Project ID");

export const zoneTypeSchema = z.enum(["flat", "unit", "room", "common", "other"]);

export const createZoneSchema = z
  .object({
    projectId,
    floorId: uuid("Floor ID"),
    name: text("Zone name", { max: 80 }),
    zoneType: zoneTypeSchema,
    area: optional(money("Area", { max: 10_000_000 })),
  })
  .strict();

export const updateZoneSchema = z
  .object({
    projectId,
    zoneId: uuid("Zone ID"),
    name: text("Zone name", { max: 80 }),
    area: optional(money("Area", { max: 10_000_000 })),
  })
  .strict();

export const deleteZoneSchema = z.object({ projectId, zoneId: uuid("Zone ID") }).strict();

export const setZoneNaSchema = z
  .object({
    projectId,
    zoneId: uuid("Zone ID"),
    activityKey: text("Activity", { max: 60 }),
    na: z.boolean(),
  })
  .strict();

export const recordObservationSchema = z
  .object({
    projectId,
    zoneId: uuid("Zone ID"),
    activityKey: text("Activity", { max: 60 }),
    stageKey: text("Stage", { max: 60 }),
    note: optionalText("Note", { max: 500 }),
  })
  .strict();

export const verifyObservationSchema = z
  .object({
    projectId,
    observationId: uuid("Observation ID"),
    decision: z.enum(["verified", "rejected"]),
  })
  .strict();

export const rollupBasisSchema = z
  .object({ projectId, basis: z.enum(["area", "equal", "custom"]) })
  .strict();

const point = z.tuple([z.number().min(0).max(1), z.number().min(0).max(1)]);

/** Zone outline on the floor plan (normalised points), or null to clear it. */
export const setZonePolygonSchema = z
  .object({
    projectId,
    zoneId: uuid("Zone ID"),
    polygon: z.array(point).min(3, "Draw at least 3 points").max(80, "At most 80 points").nullable(),
  })
  .strict();

/** Floor-plan image already uploaded to project-media, or null to remove it. */
export const setFloorPlanSchema = z
  .object({
    projectId,
    floorId: uuid("Floor ID"),
    path: z.string().max(1024).nullable(),
  })
  .strict();

export const floorPlanUploadSchema = z
  .object({ projectId, fileName: text("File name", { max: 255 }) })
  .strict();

const zoneTypeEnum = z.enum(["flat", "unit", "room", "common", "other"]);

/** Trades, stages and N/A rules. projectId null = BuildView defaults. */
export const saveTemplateSchema = z
  .object({
    projectId: uuid("Project ID").nullable(),
    /** Which method's BuildView defaults (projectId null only). */
    method: z.enum(["conventional", "mivan", "hybrid"]).optional(),
    activities: z
      .array(
        z
          .object({
            key: z.string().max(60).nullable().optional(),
            name: text("Trade", { max: 60 }),
            weight: z.number().min(0).max(100),
          })
          .strict()
      )
      .min(1)
      .max(20),
    stages: z
      .array(
        z
          .object({
            key: z.string().max(60).nullable().optional(),
            name: text("Stage", { max: 40 }),
            credit: z.number().min(0).max(100),
          })
          .strict()
      )
      .min(2)
      .max(8),
    naRules: z
      .array(z.object({ zoneType: zoneTypeEnum, activityName: text("Trade", { max: 60 }) }).strict())
      .max(200),
  })
  .strict();

export const resetTemplateSchema = z.object({ projectId }).strict();

const isoDay = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD");

/** Full plan for a project: rows replace what's stored. */
export const savePlansSchema = z
  .object({
    projectId,
    plans: z
      .array(
        z
          .object({
            floorId: uuid("Floor ID"),
            activityKey: text("Trade", { max: 60 }),
            start: isoDay,
            end: isoDay,
          })
          .strict()
          .refine((p) => p.end >= p.start, { message: "Planned end must be on or after the start" })
      )
      .max(5000),
  })
  .strict();
