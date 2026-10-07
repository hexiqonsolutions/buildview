import { z } from "zod";
import type { NotificationRuleKey } from "@/lib/admin/platform-settings";
import type { InvoiceStatus, NotificationType } from "@/lib/types";
import {
  isoDate,
  limit,
  LIMITS,
  oneOf,
  optional,
  optionalUuid,
  text,
  uuid,
} from "@/lib/validations/primitives";

export const NOTIFICATION_TYPES = [
  "info",
  "success",
  "warning",
  "error",
  "project_update",
  "issue_update",
  "invoice_update",
] as const satisfies readonly NotificationType[];

export const NOTIFICATION_RULE_KEYS = [
  "onUpload",
  "onCriticalIssue",
  "onInvoiceSent",
  "onInvoicePaid",
  "onTimeline",
  "onIssueUpdate",
  "onProjectAssigned",
  "onProjectRemoved",
] as const satisfies readonly NotificationRuleKey[];

const INVOICE_STATUSES = [
  "draft",
  "sent",
  "paid",
  "overdue",
  "cancelled",
] as const satisfies readonly InvoiceStatus[];

export const NOTIFICATION_TITLE_MAX = LIMITS.title;
export const NOTIFICATION_MESSAGE_MAX = 2000;
export const NOTIFICATION_LINK_MAX = 500;
/** Upper bound on recipients per notifyUsers call. */
export const MAX_NOTIFICATION_RECIPIENTS = 500;

export const notificationTypeSchema = oneOf("Notification type", NOTIFICATION_TYPES);
export const notificationRuleSchema = oneOf("Notification rule", NOTIFICATION_RULE_KEYS);

/**
 * In-app path under /dashboard or /admin with an optional query string, e.g.
 * "/dashboard/reports?project=<id>&report=<id>". Absolute URLs, "//host",
 * backslashes, fragments and "." / ".." segments are rejected.
 */
export const notificationLinkSchema = text("Link", {
  max: NOTIFICATION_LINK_MAX,
  pattern:
    /^\/(?:dashboard|admin)(?:\/(?!\.{1,2}(?:[/?]|$))[A-Za-z0-9._~-]+)*\/?(?:\?[A-Za-z0-9._~%=&+-]*)?$/,
  patternMessage: "Link must be a /dashboard or /admin path on this site",
});

const notificationTitle = text("Title", { max: NOTIFICATION_TITLE_MAX });
const notificationMessage = text("Message", { max: NOTIFICATION_MESSAGE_MAX, multiline: true });

export const notificationLimitSchema = limit("Limit", { max: 100 });

export const notifyPayloadSchema = z
  .object({
    title: notificationTitle,
    message: notificationMessage,
    type: notificationTypeSchema.optional(),
    link: optional(notificationLinkSchema),
    sendEmail: z.boolean({ invalid_type_error: "sendEmail must be true or false" }).optional(),
  })
  .strict();

export const createNotificationSchema = z
  .object({
    user_id: uuid("User ID"),
    title: notificationTitle,
    message: notificationMessage,
    type: notificationTypeSchema.optional(),
    link: optional(notificationLinkSchema),
  })
  .strict();

export const insertNotificationSystemSchema = createNotificationSchema
  .extend({
    created_by: optionalUuid("Created by"),
  })
  .strict();

/** Recipient ids; duplicates are allowed here because notifyUsers de-duplicates them. */
export const notificationRecipientIdsSchema = z
  .array(uuid("User ID"), { invalid_type_error: "Recipients must be a list" })
  .max(MAX_NOTIFICATION_RECIPIENTS, `At most ${MAX_NOTIFICATION_RECIPIENTS} recipients allowed`);

export const invoiceNotifyFieldsSchema = z
  .object({
    id: uuid("Invoice ID"),
    client_id: uuid("Client ID"),
    project_id: optionalUuid("Project ID"),
    invoice_number: text("Invoice number", { max: LIMITS.shortText }),
    amount: z
      .number({ required_error: "Amount is required", invalid_type_error: "Amount must be a number" })
      .finite("Amount must be a number"),
    currency: text("Currency", { max: 10, pattern: /^[A-Za-z]{3,10}$/ }),
    due_date: optional(isoDate("Due date")),
    status: oneOf("Invoice status", INVOICE_STATUSES).optional(),
  })
  .strict();

export type NotifyPayloadInput = z.infer<typeof notifyPayloadSchema>;
export type CreateNotificationInput = z.infer<typeof createNotificationSchema>;
