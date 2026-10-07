import { z } from "zod";
import { isValidMatterportUrl } from "@/lib/matterport";
import { LIMITS, optionalIsoDate, optionalText, optionalUuid, text, uuid } from "./primitives";

export const createTourSchema = z
  .object({
    project_id: uuid("Project"),
    name: text("Tour name", { min: 2, max: LIMITS.title }),
    matterport_url: text("Tour share URL", { max: LIMITS.url }).refine(isValidMatterportUrl, {
      message: "Enter a valid 360° tour share URL.",
    }),
    capture_date: optionalIsoDate("Capture date"),
    // Upload Center passes the JSON produced by buildTourDescription (notes + building/floor
    // metadata), so allow headroom above the 5,000-character notes limit for keys and escaping.
    description: optionalText("Description", { max: 12_000, multiline: true }),
  })
  .strict();

export const createTourActionSchema = createTourSchema
  .extend({
    description: optionalText("Description", { max: LIMITS.description, multiline: true }),
    building: optionalText("Building", { max: LIMITS.shortText }),
    floor: optionalText("Floor", { max: LIMITS.shortText }),
    building_id: optionalUuid("Building"),
    floor_id: optionalUuid("Floor"),
  })
  .strict();

export type CreateTourInput = z.infer<typeof createTourSchema>;
