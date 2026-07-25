"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { insertNotificationSystem, isNotificationRuleEnabled } from "@/lib/actions/platform-settings";
import { sendTransactionalEmail } from "@/lib/email/send";
import type { NotificationRuleKey } from "@/lib/admin/platform-settings";
import type { Notification, NotificationType } from "@/lib/types";
import { resolveNotificationHref } from "@/lib/portal/notification-links";

function revalidateNotificationPaths() {
  revalidatePath("/admin/notifications");
  revalidatePath("/dashboard/notifications");
}

/** Rewrite legacy project-overview links so View opens the right tab. */
function withResolvedLinks(notifications: Notification[]): Notification[] {
  return notifications.map((n) => {
    const link = resolveNotificationHref(n.link, {
      title: n.title,
      message: n.message,
      type: n.type,
    });
    return link && link !== n.link ? { ...n, link } : n;
  });
}

export async function getNotifications(limit = 50): Promise<Notification[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(limit);

  return withResolvedLinks(data ?? []);
}

/** Project name for clear upload notification copy. */
export async function getProjectNameForNotify(projectId: string): Promise<string> {
  const admin = createServiceRoleClient();
  const { data } = await admin
    .from("projects")
    .select("name")
    .eq("id", projectId)
    .maybeSingle();
  return data?.name?.trim() || "your project";
}

export async function getUnreadNotificationCount(): Promise<number> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return 0;

  const { count } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("is_read", false)
    .is("deleted_at", null);

  return count ?? 0;
}

export async function markNotificationRead(notificationId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { error } = await supabase
    .from("notifications")
    .update({
      is_read: true,
      read_at: new Date().toISOString(),
      updated_by: user.id,
    })
    .eq("id", notificationId)
    .eq("user_id", user.id);

  if (error) throw new Error(error.message);
  revalidateNotificationPaths();
}

export async function markAllNotificationsRead() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { error } = await supabase
    .from("notifications")
    .update({
      is_read: true,
      read_at: new Date().toISOString(),
      updated_by: user.id,
    })
    .eq("user_id", user.id)
    .eq("is_read", false)
    .is("deleted_at", null);

  if (error) throw new Error(error.message);
  revalidateNotificationPaths();
}

export async function createNotification(data: {
  user_id: string;
  title: string;
  message: string;
  type?: NotificationType;
  link?: string | null;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Always write via service role — RLS only allows inserting notifications for
  // yourself / super_admin, which blocks admin→client upload alerts.
  await insertNotificationSystem({
    user_id: data.user_id,
    title: data.title,
    message: data.message,
    type: data.type,
    link: data.link,
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

export async function notifyUsers(
  userIds: string[],
  payload: {
    title: string;
    message: string;
    type?: NotificationType;
    link?: string | null;
    sendEmail?: boolean;
  }
) {
  const uniqueIds = [...new Set(userIds.filter(Boolean))];
  if (uniqueIds.length === 0) {
    console.warn("[notifyUsers] no recipient user ids");
    return;
  }

  await Promise.all(
    uniqueIds.map((userId) =>
      createNotification({
        user_id: userId,
        ...payload,
      })
    )
  );

  if (payload.sendEmail !== false) {
    await emailNotificationRecipients(uniqueIds, payload);
  }

  revalidateNotificationPaths();
}

export async function notifyClientUsers(
  clientId: string,
  payload: {
    title: string;
    message: string;
    type?: NotificationType;
    link?: string | null;
    sendEmail?: boolean;
  }
) {
  const admin = createServiceRoleClient();
  const { data: users } = await admin
    .from("users")
    .select("id")
    .eq("client_id", clientId)
    .eq("is_active", true)
    .is("deleted_at", null);

  await notifyUsers(users?.map((u) => u.id) ?? [], payload);
}

export async function notifyProjectClientUsers(
  projectId: string,
  payload: {
    title: string;
    message: string;
    type?: NotificationType;
    link?: string | null;
    sendEmail?: boolean;
  }
) {
  const admin = createServiceRoleClient();

  const [{ data: project }, { data: assignments }] = await Promise.all([
    admin.from("projects").select("client_id").eq("id", projectId).maybeSingle(),
    admin
      .from("project_assignments")
      .select("user_id")
      .eq("project_id", projectId)
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
      projectId
    );
    return;
  }

  await notifyUsers([...recipientIds], payload);
}

export async function notifySuperAdmins(payload: {
  title: string;
  message: string;
  type?: NotificationType;
  link?: string | null;
  sendEmail?: boolean;
}) {
  const admin = createServiceRoleClient();
  const { data: admins } = await admin
    .from("users")
    .select("id")
    .in("role", ["super_admin", "admin", "operations_manager"])
    .eq("is_active", true)
    .is("deleted_at", null);

  await notifyUsers(admins?.map((a) => a.id) ?? [], payload);
}

type ClientNotifyPayload = {
  title: string;
  message: string;
  type?: NotificationType;
  link?: string | null;
  sendEmail?: boolean;
};

/**
 * Fail-soft client notify — never throws, so Resend/outages don't break primary writes.
 */
export async function notifyClientsIfEnabled(
  rule: NotificationRuleKey,
  projectId: string,
  payload: ClientNotifyPayload
) {
  try {
    if (!(await isNotificationRuleEnabled(rule))) return;
    await notifyProjectClientUsers(projectId, payload);
  } catch (err) {
    console.error("[notifyClientsIfEnabled]", rule, projectId, err);
  }
}

export async function notifyClientOrgIfEnabled(
  rule: NotificationRuleKey,
  clientId: string,
  payload: ClientNotifyPayload
) {
  try {
    if (!(await isNotificationRuleEnabled(rule))) return;
    await notifyClientUsers(clientId, payload);
  } catch (err) {
    console.error("[notifyClientOrgIfEnabled]", rule, clientId, err);
  }
}

export async function notifyUsersIfEnabled(
  rule: NotificationRuleKey,
  userIds: string[],
  payload: ClientNotifyPayload
) {
  try {
    if (!(await isNotificationRuleEnabled(rule))) return;
    await notifyUsers(userIds, payload);
  } catch (err) {
    console.error("[notifyUsersIfEnabled]", rule, err);
  }
}
