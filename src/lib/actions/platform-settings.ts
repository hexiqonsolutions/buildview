"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { requireBuildViewStaff } from "@/lib/supabase/server";
import { DEFAULT_CURRENCY } from "@/lib/currency";
import {
  DEFAULT_PLATFORM_SETTINGS,
  type NotificationRuleKey,
  type PlatformSettings,
} from "@/lib/admin/platform-settings";

import type { NotificationType } from "@/lib/types";
import { validate } from "@/lib/validations/parse";
import { insertNotificationSystemSchema } from "@/lib/validations/notifications";
import {
  notificationRuleSchema,
  updatePlatformSettingsSchema,
} from "@/lib/validations/platform-settings";

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
      onProjectRemoved:
        row.notification_rules?.onProjectRemoved ??
        DEFAULT_PLATFORM_SETTINGS.notifications.onProjectRemoved,
    },
  };
}

export async function getPlatformSettings(): Promise<PlatformSettings> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("platform_settings")
      .select("company_name, support_email, default_currency, timezone, notification_rules")
      .eq("id", "default")
      .maybeSingle();

    if (!error && data) return rowToSettings(data as SettingsRow);
  } catch {
    // fall through to service role / defaults
  }

  try {
    const admin = createServiceRoleClient();
    const { data } = await admin
      .from("platform_settings")
      .select("company_name, support_email, default_currency, timezone, notification_rules")
      .eq("id", "default")
      .maybeSingle();
    if (data) return rowToSettings(data as SettingsRow);
  } catch {
    // fall through
  }

  return DEFAULT_PLATFORM_SETTINGS;
}

export async function updatePlatformSettings(
  settings: PlatformSettings
): Promise<{ success: boolean; error?: string }> {
  const parsed = validate(updatePlatformSettingsSchema, settings);
  if (!parsed.success) return { success: false, error: parsed.error };
  const valid = parsed.data;

  try {
    await requireBuildViewStaff();
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error } = await supabase
      .from("platform_settings")
      .update({
        company_name: valid.companyName ?? DEFAULT_PLATFORM_SETTINGS.companyName,
        support_email: valid.supportEmail ?? DEFAULT_PLATFORM_SETTINGS.supportEmail,
        default_currency: valid.defaultCurrency?.toUpperCase() ?? DEFAULT_CURRENCY,
        timezone: valid.timezone ?? DEFAULT_PLATFORM_SETTINGS.timezone,
        notification_rules: valid.notifications,
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
  const parsedRule = validate(notificationRuleSchema, rule);
  if (!parsedRule.success) {
    console.warn("[isNotificationRuleEnabled] rejected invalid input:", parsedRule.error);
    return false;
  }

  const settings = await getPlatformSettings();
  return settings.notifications[parsedRule.data];
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

  if (error) throw new Error(error.message);
}
