import { z } from "zod";
import { analyticsEvents } from "@/lib/analytics/events";
import { optionalEmail } from "@/lib/validations/primitives";

const eventNames = Object.values(analyticsEvents) as [string, ...string[]];

const paramValue = z.union([
  z.string().max(500, "Event parameter values must be at most 500 characters"),
  z.number().finite(),
  z.boolean(),
]);

/** Body of POST /api/analytics/meta, sent by trackEvent() in src/lib/analytics/track.ts. */
export const metaEventBodySchema = z
  .object({
    eventName: z.enum(eventNames, { errorMap: () => ({ message: "Unsupported event" }) }),
    eventId: z
      .string()
      .regex(/^[A-Za-z0-9-]{1,64}$/, "Invalid event id")
      .optional(),
    eventSourceUrl: z
      .string()
      .max(2048, "Event source URL is too long")
      .url("Invalid event source URL")
      .refine((value) => /^https?:\/\//.test(value), { message: "Invalid event source URL" })
      .optional(),
    params: z
      .record(z.string().regex(/^[A-Za-z_][A-Za-z0-9_]{0,39}$/, "Invalid event parameter name"), paramValue)
      .refine((value) => Object.keys(value).length <= 20, { message: "Too many event parameters" })
      .optional(),
    email: optionalEmail(),
  })
  .strict();
