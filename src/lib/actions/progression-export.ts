"use server";

import { getProgressionExportPayload } from "@/lib/data/progression-export";
import { getErrorMessage, PublicError } from "@/lib/errors/public";
import type { ProgressionExportPayload } from "@/lib/progression/export-types";
import { validate } from "@/lib/validations/parse";
import { projectIdSchema } from "@/lib/validations/data";
import { z } from "zod";

const exportInputSchema = z.object({
  projectId: projectIdSchema,
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid from date"),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid to date"),
});

export async function getProgressionExportData(input: {
  projectId: string;
  from: string;
  to: string;
}): Promise<
  | { ok: true; data: ProgressionExportPayload }
  | { ok: false; error: string }
> {
  try {
    const parsed = validate(exportInputSchema, input);
    if (!parsed.success) throw new PublicError(parsed.error);
    if (parsed.data.from > parsed.data.to) {
      throw new PublicError("From date must be on or before the to date.");
    }

    const data = await getProgressionExportPayload(
      parsed.data.projectId,
      parsed.data.from,
      parsed.data.to
    );
    if (!data) {
      throw new PublicError("Progression export is not available for this project.");
    }
    return { ok: true, data };
  } catch (err) {
    return {
      ok: false,
      error: getErrorMessage(err, "Could not prepare progression export."),
    };
  }
}
