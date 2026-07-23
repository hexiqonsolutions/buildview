"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { requireBuildViewStaff } from "@/lib/supabase/server";
import {
  DEFAULT_PLATFORM_SETTINGS,
  type NotificationRuleKey,
  type PlatformSettings,
} from "@/lib/admin/platform-settings";
import type { NotificationType } from "@/lib/types";

type SettingsRow = {
  company_name: string;
  support_email: string;
  default_currency: string;
  timezone: string;
  notification_rules: Partial<Record<NotificationRuleKey, boolean>>;
};

function rowToSettings(row: SettingsRow): PlatformSettings {
  return {
    companyName: row.company_name,
    supportEmail: row.support_email,
    defaultCurrency: row.default_currency,
    timezone: row.timezone,
    notifications: {
      onUpload: row.notification_rules?.onUpload ?? DEFAULT_PLATFORM_SETTINGS.notifications.onUpload,
      onCriticalIssue:
        row.notification_rules?.onCriticalIssue ??
        DEFAULT_PLATFORM_SETTINGS.notifications.onCriticalIssue,
      onInvoiceSent:
        row.notification_rules?.onInvoiceSent ??
        DEFAULT_PLATFORM_SETTINGS.notifications.onInvoiceSent,
      onInvoicePaid:
        row.notification_rules?.onInvoicePaid ??
        DEFAULT_PLATFORM_SETTINGS.notifications.onInvoicePaid,
      onTimeline:
        row.notification_rules?.onTimeline ?? DEFAULT_PLATFORM_SETTINGS.notifications.onTimeline,
      onIssueUpdate:
        row.notification_rules?.onIssueUpdate ??
        DEFAULT_PLATFORM_SETTINGS.notifications.onIssueUpdate,
      onProjectAssigned:
        row.notification_rules?.onProjectAssigned ??
        DEFAULT_PLATFORM_SETTINGS.notifications.onProjectAssigned,
    },
  };
}

export async function getPlatformSettings(): Promise<PlatformSettings> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("platform_settings")
    .select("company_name, support_email, default_currency, timezone, notification_rules")
    .eq("id", "default")
    .maybeSingle();

  if (error || !data) return DEFAULT_PLATFORM_SETTINGS;
  return rowToSettings(data as SettingsRow);
}

export async function updatePlatformSettings(
  settings: PlatformSettings
): Promise<{ success: boolean; error?: string }> {
  try {
    await requireBuildViewStaff();
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error } = await supabase
      .from("platform_settings")
      .update({
        company_name: settings.companyName.trim() || DEFAULT_PLATFORM_SETTINGS.companyName,
        support_email: settings.supportEmail.trim() || DEFAULT_PLATFORM_SETTINGS.supportEmail,
        default_currency: settings.defaultCurrency.trim().toUpperCase() || "USD",
        timezone: settings.timezone.trim() || DEFAULT_PLATFORM_SETTINGS.timezone,
        notification_rules: settings.notifications,
        updated_by: user?.id ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", "default");

    if (error) return { success: false, error: error.message };

    revalidatePath("/admin/settings");
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to save settings",
    };
  }
}

export async function isNotificationRuleEnabled(
  rule: keyof PlatformSettings["notifications"]
): Promise<boolean> {
  const settings = await getPlatformSettings();
  return settings.notifications[rule];
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
  const admin = createServiceRoleClient();
  const { error } = await admin.from("notifications").insert({
    user_id: data.user_id,
    title: data.title,
    message: data.message,
    type: data.type ?? "info",
    link: data.link ?? null,
    is_read: false,
    read_at: null,
    created_by: data.created_by ?? null,
    updated_by: null,
  });

  if (error) throw new Error(error.message);
}
