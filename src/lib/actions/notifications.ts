"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Notification } from "@/lib/types";
import { resolveNotificationHref } from "@/lib/portal/notification-links";
import { validate } from "@/lib/validations/parse";
import { notificationLimitSchema } from "@/lib/validations/notifications";
import { PublicError } from "@/lib/errors/public";
import { internalError } from "@/lib/errors/server";

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
  const parsedLimit = validate(notificationLimitSchema, limit);
  if (!parsedLimit.success) return [];

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
    .limit(parsedLimit.data);

  return withResolvedLinks(data ?? []);
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

export async function markAllNotificationsRead() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new PublicError("Unauthorized");

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

  if (error) throw internalError("markAllNotificationsRead", error);
  revalidateNotificationPaths();
}
