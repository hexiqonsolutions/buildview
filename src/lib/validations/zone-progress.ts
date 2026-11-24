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
