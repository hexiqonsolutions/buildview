import { z } from "zod";

export const saveComparisonSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(120),
  projectId: z.string().uuid(),
  tourAId: z.string().uuid(),
  tourBId: z.string().uuid(),
  building: z.string().default("all"),
  floor: z.string().default("all"),
  buildingId: z.string().uuid().nullable().optional(),
  floorId: z.string().uuid().nullable().optional(),
  clientId: z.string().uuid().nullable().optional(),
});

export type SaveComparisonInput = z.infer<typeof saveComparisonSchema>;
