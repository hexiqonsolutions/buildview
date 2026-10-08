import { z } from "zod";
import { LIMITS, optionalUuid, text, uuid } from "@/lib/validations/primitives";

const scopeLabel = (label: string) =>
  z.preprocess(
    (value) => (value === undefined || value === "" ? "all" : value),
    text(label, { max: LIMITS.shortText })
  );

export const saveComparisonSchema = z
  .object({
    name: text("Name", { min: 2, max: 120 }),
    projectId: uuid("Project"),
    tourAId: uuid("Scan A"),
    tourBId: uuid("Scan B"),
    building: scopeLabel("Building"),
    floor: scopeLabel("Floor"),
    buildingId: optionalUuid("Building"),
    floorId: optionalUuid("Floor"),
    clientId: optionalUuid("Client"),
  })
  .strict();
