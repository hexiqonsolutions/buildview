import { z } from "zod";
import { optionalEmail, optionalText, LIMITS } from "@/lib/validations/primitives";
import { notificationRuleSchema } from "@/lib/validations/notifications";

function isKnownTimeZone(value: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

const ruleToggle = z.boolean({
  required_error: "Every notification rule must be set",
  invalid_type_error: "Notification rules must be true or false",
});

export const notificationRulesSchema = z
  .object({
    onUpload: ruleToggle,
    onCriticalIssue: ruleToggle,
    onInvoiceSent: ruleToggle,
    onInvoicePaid: ruleToggle,
    onTimeline: ruleToggle,
    onIssueUpdate: ruleToggle,
    onProjectAssigned: ruleToggle,
    onProjectRemoved: ruleToggle,
  })
  .strict();

/**
 * Blank text fields become `null` so the action can fall back to the platform
 * defaults; anything non-blank must match its format.
 */
export const updatePlatformSettingsSchema = z
  .object({
    companyName: optionalText("Company name", { max: LIMITS.shortText }),
    supportEmail: optionalEmail("Support email"),
    defaultCurrency: optionalText("Default currency", {
      max: 3,
      pattern: /^[A-Za-z]{3}$/,
      patternMessage: "Default currency must be a 3-letter code such as INR",
    }),
    timezone: optionalText("Timezone", {
      max: 64,
      pattern: /^[A-Za-z][A-Za-z0-9_+-]*(?:\/[A-Za-z0-9_+-]+){0,2}$/,
      patternMessage: "Timezone must be an IANA name such as Asia/Kolkata",
    }).refine((value) => value === null || isKnownTimeZone(value), {
      message: "Timezone must be an IANA name such as Asia/Kolkata",
    }),
    notifications: notificationRulesSchema,
  })
  .strict();

export { notificationRuleSchema };

export type UpdatePlatformSettingsInput = z.infer<typeof updatePlatformSettingsSchema>;
