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
import { sendTransactionalEmail } from "@/lib/email/send";
import type { NotificationRuleKey, PlatformSettings } from "@/lib/admin/platform-settings";
import type { NotificationType } from "@/lib/types";
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

type NotifyPayload = {
  title: string;
  message: string;
  type?: NotificationType;
  link?: string | null;
  sendEmail?: boolean;
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
export async function insertNotificationSystem(data: {
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

export async function createNotification(data: {
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

  // Always write via service role — RLS only allows inserting notifications for
  // yourself / super_admin, which blocks admin→client upload alerts.
  await insertNotificationSystem({
    user_id: parsed.data.user_id,
    title: parsed.data.title,
    message: parsed.data.message,
    type: parsed.data.type,
    link: parsed.data.link,
    created_by: user?.id ?? null,
  });
}

async function emailNotificationRecipients(
  userIds: string[],
  payload: { title: string; message: string; link?: string | null }
) {
  if (userIds.length === 0) return;

  try {
    const admin = createServiceRoleClient();
    const { data: users } = await admin
      .from("users")
      .select("email, full_name")
      .in("id", userIds)
      .eq("is_active", true)
      .is("deleted_at", null);

    const emails = users?.map((u) => u.email).filter(Boolean) as string[];
    if (!emails?.length) return;

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const linkLine = payload.link ? `\n\nView: ${appUrl}${payload.link}` : "";

    await sendTransactionalEmail({
      to: emails,
      subject: `[BuildView] ${payload.title}`,
      text: `${payload.message}${linkLine}`,
    });
  } catch (err) {
    console.error("[emailNotificationRecipients]", err);
  }
}

export async function notifyUsers(userIds: string[], payload: NotifyPayload) {
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

  await Promise.all(
    uniqueIds.map((userId) =>
      createNotification({
        user_id: userId,
        ...notification,
      })
    )
  );

  if (sendEmail !== false) {
    await emailNotificationRecipients(uniqueIds, notification);
  }

  revalidateNotificationPaths();
}

/** Notify Client Admin users for an invoice (billing is org-admin scoped). */
export async function notifyInvoiceRecipients(
  invoice: InvoiceNotifyFields,
  payload: InvoiceNotifyPayload
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

  await notifyUsers(admins?.map((u) => u.id) ?? [], parsedPayload.data);
}

export async function notifyClientUsers(clientId: string, payload: NotifyPayload) {
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

  await notifyUsers(users?.map((u) => u.id) ?? [], parsedPayload.data);
}

export async function notifyProjectClientUsers(projectId: string, payload: NotifyPayload) {
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

  await notifyUsers([...recipientIds], parsedPayload.data);
}

export async function notifySuperAdmins(payload: NotifyPayload) {
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

  await notifyUsers(admins?.map((a) => a.id) ?? [], parsedPayload.data);
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
    await notifyProjectClientUsers(parsedProjectId.data, parsedPayload.data);
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
    await notifyClientUsers(parsedClientId.data, parsedPayload.data);
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
    await notifyUsers(parsedIds.data, parsedPayload.data);
  } catch (err) {
    console.error("[notifyUsersIfEnabled]", rule, err);
  }
}
