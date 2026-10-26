/**
 * Server-internal notification senders. Deliberately not a "use server" module:
 * every export of such a module is a publicly callable endpoint, and these write
 * with the service role on behalf of whoever triggered the event. Only call them
 * from server code that has already authorized the triggering action.
 */
import "server-only";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { getPlatformSettings } from "@/lib/actions/platform-settings";
import {
  buildNotificationEmailHtml,
  sendTransactionalEmail,
} from "@/lib/email/send";
import { siteConfig } from "@/lib/site-config";
import type { NotificationRuleKey, PlatformSettings } from "@/lib/admin/platform-settings";
import type {
  NotificationDeliveryChannel,
  NotificationDeliveryStatus,
  NotificationType,
} from "@/lib/types";
import type { InvoiceNotifyFields, InvoiceNotifyPayload } from "@/lib/portal/invoice-notifications";
import { validate, type ValidationResult } from "@/lib/validations/parse";
import { uuid } from "@/lib/validations/primitives";
import {
  createNotificationSchema,
  insertNotificationSystemSchema,
  invoiceNotifyFieldsSchema,
  notificationRecipientIdsSchema,
  notificationRuleSchema,
  notifyPayloadSchema,
} from "@/lib/validations/notifications";
import { internalError } from "@/lib/errors/server";
import { isValidE164 } from "@/lib/notifications/phone";
import {
  isWhatsAppCriticalRule,
  sendWhatsAppMessage,
} from "@/lib/whatsapp/send";

type NotifyPayload = {
  title: string;
  message: string;
  type?: NotificationType;
  link?: string | null;
  sendEmail?: boolean;
};

type NotifyOptions = {
  rule?: NotificationRuleKey;
};

type RecipientRow = {
  id: string;
  email: string;
  full_name: string;
  email_notifications: boolean | null;
  whatsapp_notifications: boolean | null;
  phone_e164: string | null;
  whatsapp_opt_in_at: string | null;
};

function warnInvalidInput(fn: string, ...results: ValidationResult<unknown>[]) {
  const failed = results.find(
    (result): result is { success: false; error: string } => !result.success
  );
  console.warn(`[${fn}] rejected invalid input:`, failed?.error ?? "Invalid input");
}

function revalidateNotificationPaths() {
  revalidatePath("/admin/notifications");
  revalidatePath("/dashboard/notifications");
}

function absoluteLink(link?: string | null): string | null {
  if (!link) return null;
  return link.startsWith("http") ? link : `${siteConfig.url}${link}`;
}

async function logDelivery(entry: {
  user_id: string;
  channel: NotificationDeliveryChannel;
  rule?: NotificationRuleKey | null;
  status: NotificationDeliveryStatus;
  provider_id?: string | null;
  error?: string | null;
  title?: string | null;
}) {
  try {
    const admin = createServiceRoleClient();
    await admin.from("notification_deliveries").insert({
      user_id: entry.user_id,
      channel: entry.channel,
      rule: entry.rule ?? null,
      status: entry.status,
      provider_id: entry.provider_id ?? null,
      error: entry.error ?? null,
      title: entry.title ?? null,
    });
  } catch (err) {
    console.error("[logDelivery]", err);
  }
}

export async function isNotificationRuleEnabled(
  rule: keyof PlatformSettings["notifications"]
): Promise<boolean> {
  const parsedRule = validate(notificationRuleSchema, rule);
  if (!parsedRule.success) {
    console.warn("[isNotificationRuleEnabled] rejected invalid input:", parsedRule.error);
    return false;
  }

  const settings = await getPlatformSettings();
  return settings.notifications[parsedRule.data];
}

/** Project name for clear upload notification copy. */
export async function getProjectNameForNotify(projectId: string): Promise<string> {
  const parsedId = validate(uuid("Project ID"), projectId);
  if (!parsedId.success) return "your project";

  const admin = createServiceRoleClient();
  const { data } = await admin
    .from("projects")
    .select("name")
    .eq("id", parsedId.data)
    .maybeSingle();
  return data?.name?.trim() || "your project";
}

/** Service-role insert — bypasses RLS when non-admin actors trigger system alerts. */
async function insertNotificationSystem(data: {
  user_id: string;
  title: string;
  message: string;
  type?: NotificationType;
  link?: string | null;
  created_by?: string | null;
}) {
  const parsed = validate(insertNotificationSystemSchema, data);
  if (!parsed.success) {
    console.warn("[insertNotificationSystem] rejected invalid input:", parsed.error);
    return;
  }
  const valid = parsed.data;

  const admin = createServiceRoleClient();
  const { error } = await admin.from("notifications").insert({
    user_id: valid.user_id,
    title: valid.title,
    message: valid.message,
    type: valid.type ?? "info",
    link: valid.link ?? null,
    is_read: false,
    read_at: null,
    created_by: valid.created_by ?? null,
    updated_by: null,
  });

  if (error) throw internalError("insertNotificationSystem", error);
}

async function createNotification(data: {
  user_id: string;
  title: string;
  message: string;
  type?: NotificationType;
  link?: string | null;
}) {
  const parsed = validate(createNotificationSchema, data);
  if (!parsed.success) {
    warnInvalidInput("createNotification", parsed);
    return;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  await insertNotificationSystem({
    user_id: parsed.data.user_id,
    title: parsed.data.title,
    message: parsed.data.message,
    type: parsed.data.type,
    link: parsed.data.link,
    created_by: user?.id ?? null,
  });
}

async function loadRecipients(userIds: string[]): Promise<RecipientRow[]> {
  const admin = createServiceRoleClient();
  const withPrefs = await admin
    .from("users")
    .select(
      "id, email, full_name, email_notifications, whatsapp_notifications, phone_e164, whatsapp_opt_in_at"
    )
    .in("id", userIds)
    .eq("is_active", true)
    .is("deleted_at", null);

  if (!withPrefs.error) {
    return (withPrefs.data ?? []).map((row) => ({
      id: row.id,
      email: row.email,
      full_name: row.full_name,
      email_notifications: row.email_notifications ?? true,
      whatsapp_notifications: row.whatsapp_notifications ?? false,
      phone_e164: row.phone_e164 ?? null,
      whatsapp_opt_in_at: row.whatsapp_opt_in_at ?? null,
    }));
  }

  // Migration 040 not applied yet — fall back so email still attempts to send.
  console.warn(
    "[loadRecipients] preference columns missing; apply migration 040. Falling back to email-only.",
    withPrefs.error.message
  );

  const fallback = await admin
    .from("users")
    .select("id, email, full_name")
    .in("id", userIds)
    .eq("is_active", true)
    .is("deleted_at", null);

  return (fallback.data ?? []).map((row) => ({
    id: row.id,
    email: row.email,
    full_name: row.full_name,
    email_notifications: true,
    whatsapp_notifications: false,
    phone_e164: null,
    whatsapp_opt_in_at: null,
  }));
}

async function emailNotificationRecipients(
  userIds: string[],
  payload: { title: string; message: string; link?: string | null },
  rule?: NotificationRuleKey
) {
  if (userIds.length === 0) return;

  try {
    const users = await loadRecipients(userIds);
    const absolute = absoluteLink(payload.link);
    const linkLine = absolute ? `\n\nView: ${absolute}` : "";
    const html = buildNotificationEmailHtml({
      title: payload.title,
      message: payload.message,
      link: payload.link,
    });

    await Promise.all(
      users.map(async (user) => {
        if (user.email_notifications === false) {
          await logDelivery({
            user_id: user.id,
            channel: "email",
            rule,
            status: "skipped",
            error: "email_notifications disabled",
            title: payload.title,
          });
          return;
        }

        if (!user.email?.includes("@")) {
          await logDelivery({
            user_id: user.id,
            channel: "email",
            rule,
            status: "skipped",
            error: "missing email",
            title: payload.title,
          });
          return;
        }

        const result = await sendTransactionalEmail({
          to: user.email,
          subject: `[BuildView] ${payload.title}`,
          text: `${payload.message}${linkLine}`,
          html,
        });

        await logDelivery({
          user_id: user.id,
          channel: "email",
          rule,
          status: result.ok ? "sent" : result.skipped ? "skipped" : "failed",
          provider_id: result.providerId ?? null,
          error: result.error ?? null,
          title: payload.title,
        });
      })
    );
  } catch (err) {
    console.error("[emailNotificationRecipients]", err);
  }
}

async function whatsappNotificationRecipients(
  userIds: string[],
  payload: { title: string; message: string; link?: string | null },
  rule: NotificationRuleKey
) {
  if (!isWhatsAppCriticalRule(rule) || userIds.length === 0) return;

  try {
    const users = await loadRecipients(userIds);
    const absolute = absoluteLink(payload.link);
    const body = [
      `*BuildView* — ${payload.title}`,
      payload.message,
      absolute ? `Open: ${absolute}` : null,
    ]
      .filter(Boolean)
      .join("\n\n");

    await Promise.all(
      users.map(async (user) => {
        if (!user.whatsapp_notifications || !user.whatsapp_opt_in_at) {
          await logDelivery({
            user_id: user.id,
            channel: "whatsapp",
            rule,
            status: "skipped",
            error: "whatsapp not opted in",
            title: payload.title,
          });
          return;
        }

        if (!isValidE164(user.phone_e164)) {
          await logDelivery({
            user_id: user.id,
            channel: "whatsapp",
            rule,
            status: "skipped",
            error: "missing or invalid phone_e164",
            title: payload.title,
          });
          return;
        }

        const result = await sendWhatsAppMessage({
          toE164: user.phone_e164!,
          body,
          rule,
          variables: {
            title: payload.title,
            message: payload.message,
            link: absolute ?? undefined,
          },
        });

        await logDelivery({
          user_id: user.id,
          channel: "whatsapp",
          rule,
          status: result.ok ? "sent" : result.skipped ? "skipped" : "failed",
          provider_id: result.providerId ?? null,
          error: result.error ?? null,
          title: payload.title,
        });
      })
    );
  } catch (err) {
    console.error("[whatsappNotificationRecipients]", err);
  }
}

async function notifyUsers(
  userIds: string[],
  payload: NotifyPayload,
  options?: NotifyOptions
) {
  const parsedIds = validate(notificationRecipientIdsSchema, userIds);
  const parsedPayload = validate(notifyPayloadSchema, payload);
  if (!parsedIds.success || !parsedPayload.success) {
    warnInvalidInput("notifyUsers", parsedIds, parsedPayload);
    return;
  }

  const uniqueIds = [...new Set(parsedIds.data)];
  if (uniqueIds.length === 0) {
    console.warn("[notifyUsers] no recipient user ids");
    return;
  }

  const { sendEmail, ...notification } = parsedPayload.data;
  const rule = options?.rule;

  await Promise.all(
    uniqueIds.map((userId) =>
      createNotification({
        user_id: userId,
        ...notification,
      })
    )
  );

  if (sendEmail !== false) {
    await emailNotificationRecipients(uniqueIds, notification, rule);
  }

  if (rule) {
    await whatsappNotificationRecipients(uniqueIds, notification, rule);
  }

  revalidateNotificationPaths();
}

/** Notify Client Admin users for an invoice (billing is org-admin scoped). */
export async function notifyInvoiceRecipients(
  invoice: InvoiceNotifyFields,
  payload: InvoiceNotifyPayload,
  rule?: NotificationRuleKey
) {
  const parsedInvoice = validate(invoiceNotifyFieldsSchema, invoice);
  const parsedPayload = validate(notifyPayloadSchema, payload);
  if (!parsedInvoice.success || !parsedPayload.success) {
    warnInvalidInput("notifyInvoiceRecipients", parsedInvoice, parsedPayload);
    return;
  }

  const admin = createServiceRoleClient();
  const { data: admins } = await admin
    .from("users")
    .select("id")
    .eq("client_id", parsedInvoice.data.client_id)
    .eq("role", "client_admin")
    .eq("is_active", true)
    .is("deleted_at", null);

  await notifyUsers(admins?.map((u) => u.id) ?? [], parsedPayload.data, { rule });
}

async function notifyClientUsers(
  clientId: string,
  payload: NotifyPayload,
  options?: NotifyOptions
) {
  const parsedClientId = validate(uuid("Client ID"), clientId);
  const parsedPayload = validate(notifyPayloadSchema, payload);
  if (!parsedClientId.success || !parsedPayload.success) {
    warnInvalidInput("notifyClientUsers", parsedClientId, parsedPayload);
    return;
  }

  const admin = createServiceRoleClient();
  const { data: users } = await admin
    .from("users")
    .select("id")
    .eq("client_id", parsedClientId.data)
    .eq("is_active", true)
    .is("deleted_at", null);

  await notifyUsers(users?.map((u) => u.id) ?? [], parsedPayload.data, options);
}

export async function notifyProjectClientUsers(
  projectId: string,
  payload: NotifyPayload,
  options?: NotifyOptions
) {
  const parsedProjectId = validate(uuid("Project ID"), projectId);
  const parsedPayload = validate(notifyPayloadSchema, payload);
  if (!parsedProjectId.success || !parsedPayload.success) {
    warnInvalidInput("notifyProjectClientUsers", parsedProjectId, parsedPayload);
    return;
  }

  const admin = createServiceRoleClient();

  const [{ data: project }, { data: assignments }] = await Promise.all([
    admin.from("projects").select("client_id").eq("id", parsedProjectId.data).maybeSingle(),
    admin
      .from("project_assignments")
      .select("user_id")
      .eq("project_id", parsedProjectId.data)
      .is("deleted_at", null),
  ]);

  const recipientIds = new Set<string>();

  for (const row of assignments ?? []) {
    if (row.user_id) recipientIds.add(row.user_id);
  }

  if (project?.client_id) {
    const { data: orgUsers } = await admin
      .from("users")
      .select("id")
      .eq("client_id", project.client_id)
      .eq("is_active", true)
      .is("deleted_at", null);

    for (const u of orgUsers ?? []) {
      recipientIds.add(u.id);
    }
  }

  if (recipientIds.size === 0) {
    console.warn(
      "[notifyProjectClientUsers] no client recipients for project",
      parsedProjectId.data
    );
    return;
  }

  await notifyUsers([...recipientIds], parsedPayload.data, options);
}

export async function notifySuperAdmins(
  payload: NotifyPayload,
  options?: NotifyOptions
) {
  const parsedPayload = validate(notifyPayloadSchema, payload);
  if (!parsedPayload.success) {
    warnInvalidInput("notifySuperAdmins", parsedPayload);
    return;
  }

  const admin = createServiceRoleClient();
  const { data: admins } = await admin
    .from("users")
    .select("id")
    .in("role", ["super_admin", "admin", "operations_manager"])
    .eq("is_active", true)
    .is("deleted_at", null);

  await notifyUsers(admins?.map((a) => a.id) ?? [], parsedPayload.data, options);
}

/**
 * Fail-soft client notify — never throws, so Resend/outages don't break primary writes.
 */
export async function notifyClientsIfEnabled(
  rule: NotificationRuleKey,
  projectId: string,
  payload: NotifyPayload
) {
  const parsedRule = validate(notificationRuleSchema, rule);
  const parsedProjectId = validate(uuid("Project ID"), projectId);
  const parsedPayload = validate(notifyPayloadSchema, payload);
  if (!parsedRule.success || !parsedProjectId.success || !parsedPayload.success) {
    warnInvalidInput("notifyClientsIfEnabled", parsedRule, parsedProjectId, parsedPayload);
    return;
  }

  try {
    if (!(await isNotificationRuleEnabled(parsedRule.data))) return;
    await notifyProjectClientUsers(parsedProjectId.data, parsedPayload.data, {
      rule: parsedRule.data,
    });
  } catch (err) {
    console.error("[notifyClientsIfEnabled]", rule, projectId, err);
  }
}

export async function notifyClientOrgIfEnabled(
  rule: NotificationRuleKey,
  clientId: string,
  payload: NotifyPayload
) {
  const parsedRule = validate(notificationRuleSchema, rule);
  const parsedClientId = validate(uuid("Client ID"), clientId);
  const parsedPayload = validate(notifyPayloadSchema, payload);
  if (!parsedRule.success || !parsedClientId.success || !parsedPayload.success) {
    warnInvalidInput("notifyClientOrgIfEnabled", parsedRule, parsedClientId, parsedPayload);
    return;
  }

  try {
    if (!(await isNotificationRuleEnabled(parsedRule.data))) return;
    await notifyClientUsers(parsedClientId.data, parsedPayload.data, {
      rule: parsedRule.data,
    });
  } catch (err) {
    console.error("[notifyClientOrgIfEnabled]", rule, clientId, err);
  }
}

export async function notifyUsersIfEnabled(
  rule: NotificationRuleKey,
  userIds: string[],
  payload: NotifyPayload
) {
  const parsedRule = validate(notificationRuleSchema, rule);
  const parsedIds = validate(notificationRecipientIdsSchema, userIds);
  const parsedPayload = validate(notifyPayloadSchema, payload);
  if (!parsedRule.success || !parsedIds.success || !parsedPayload.success) {
    warnInvalidInput("notifyUsersIfEnabled", parsedRule, parsedIds, parsedPayload);
    return;
  }

  try {
    if (!(await isNotificationRuleEnabled(parsedRule.data))) return;
    await notifyUsers(parsedIds.data, parsedPayload.data, { rule: parsedRule.data });
  } catch (err) {
    console.error("[notifyUsersIfEnabled]", rule, err);
  }
}
