import { z } from "zod";
import { isValidMatterportUrl } from "@/lib/matterport";

export const createTourSchema = z.object({
  project_id: z.string().uuid("Please select a project"),
  name: z.string().min(2, "Tour name must be at least 2 characters"),
  matterport_url: z
    .string()
    .min(1, "Matterport URL is required")
    .refine(isValidMatterportUrl, {
      message:
        "Invalid Matterport URL. Paste a link from my.matterport.com (e.g. https://my.matterport.com/show/?m=...)",
    }),
  capture_date: z.string().optional(),
  description: z.string().optional(),
});

export type CreateTourInput = z.infer<typeof createTourSchema>;
