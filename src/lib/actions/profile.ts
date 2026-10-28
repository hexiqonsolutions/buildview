"use server";

import { revalidatePath } from "next/cache";
import { createClient, getUserProfile } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { getSupabaseUrl } from "@/lib/supabase/env";
import { logServerError, toPublicMessage } from "@/lib/errors/server";
import { validate, validateFormData } from "@/lib/validations/parse";
import {
  avatarUrlSchema,
  updateNotificationPreferencesSchema,
  updateProfileSchema,
} from "@/lib/validations/profile";
import { publicObjectPath, UPLOAD_RULES, verifyStoredUpload } from "@/lib/uploads/verify";
import { STORAGE_BUCKETS } from "@/lib/types";
import { toE164Phone } from "@/lib/notifications/phone";

export type ProfileActionState = {
  error?: string;
  success?: string;
};

function revalidateProfileSurfaces() {
  revalidatePath("/dashboard/profile");
  revalidatePath("/dashboard");
  revalidatePath("/admin");
}

export async function getProfileForPage() {
  return getUserProfile();
}

export async function updateProfile(
  _prevState: ProfileActionState,
  formData: FormData
): Promise<ProfileActionState> {
  const parsed = validateFormData(updateProfileSchema, formData);

  if (!parsed.success) {
    return { error: parsed.error };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be signed in to update your profile." };
  }

  const { error } = await supabase
    .from("users")
    .update({
      full_name: parsed.data.full_name,
      phone: parsed.data.phone,
      updated_by: user.id,
    })
    .eq("id", user.id)
    .is("deleted_at", null);

  if (error) {
    logServerError("updateProfile", error, { userId: user.id });
    return { error: "Could not save your profile. Please try again." };
  }

  revalidateProfileSurfaces();

  return { success: "Profile updated successfully." };
}

function isMissingNotificationColumnError(error: { message?: string; code?: string } | null): boolean {
  if (!error?.message) return false;
  const message = error.message.toLowerCase();
  return (
    message.includes("email_notifications") ||
    message.includes("whatsapp_notifications") ||
    message.includes("phone_e164") ||
    message.includes("whatsapp_opt_in_at") ||
    message.includes("schema cache")
  );
}

export async function updateNotificationPreferences(
  _prevState: ProfileActionState,
  formData: FormData
): Promise<ProfileActionState> {
  try {
    const parsed = validateFormData(updateNotificationPreferencesSchema, formData);
    if (!parsed.success) {
      return { error: parsed.error };
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { error: "You must be signed in to update notification preferences." };
    }

    const emailEnabled = parsed.data.email_notifications;
    const whatsappEnabled = parsed.data.whatsapp_notifications;
    const submittedPhone = parsed.data.phone;
    const phoneE164 = toE164Phone(submittedPhone);

    if (whatsappEnabled && !phoneE164) {
      return {
        error: "Enter a valid mobile number with country code to enable WhatsApp alerts.",
      };
    }

    // Prefer service role so preference columns always persist (same pattern as avatar).
    let writer;
    try {
      writer = createServiceRoleClient();
    } catch {
      writer = supabase;
    }

    const { data: existing, error: existingError } = await writer
      .from("users")
      .select("whatsapp_opt_in_at, phone, phone_e164")
      .eq("id", user.id)
      .is("deleted_at", null)
      .maybeSingle();

    if (existingError) {
      logServerError("updateNotificationPreferences", existingError, { userId: user.id });
      if (isMissingNotificationColumnError(existingError)) {
        return {
          error:
            "Notification columns are missing in the database. Apply migration 040_notification_preferences.sql in Supabase, then try again.",
        };
      }
      return { error: "Could not load your notification preferences. Please try again." };
    }

    const wasOptedIn = Boolean(existing?.whatsapp_opt_in_at);
    const whatsappOptInAt = whatsappEnabled
      ? wasOptedIn
        ? existing?.whatsapp_opt_in_at ?? new Date().toISOString()
        : new Date().toISOString()
      : null;

    // Keep a stored number even when WhatsApp is off (disabled inputs used to wipe it).
    const nextPhoneE164 = phoneE164 ?? (whatsappEnabled ? null : existing?.phone_e164 ?? null);
    const nextDisplayPhone = submittedPhone ?? existing?.phone ?? null;

    const { data: updated, error } = await writer
      .from("users")
      .update({
        email_notifications: emailEnabled,
        whatsapp_notifications: whatsappEnabled,
        phone_e164: nextPhoneE164,
        whatsapp_opt_in_at: whatsappOptInAt,
        phone: nextDisplayPhone,
        updated_by: user.id,
      })
      .eq("id", user.id)
      .is("deleted_at", null)
      .select("id")
      .maybeSingle();

    if (error) {
      logServerError("updateNotificationPreferences", error, { userId: user.id });
      if (isMissingNotificationColumnError(error)) {
        return {
          error:
            "Notification columns are missing in the database. Apply migration 040_notification_preferences.sql in Supabase, then try again.",
        };
      }
      return { error: "Could not save notification preferences. Please try again." };
    }

    if (!updated) {
      logServerError("updateNotificationPreferences", "No row updated", { userId: user.id });
      return { error: "Could not save notification preferences. Please try again." };
    }

    revalidatePath("/dashboard/profile");
    revalidatePath("/dashboard", "layout");
    return { success: "Notification preferences saved." };
  } catch (err) {
    return {
      error: toPublicMessage(
        "updateNotificationPreferences",
        err,
        "Could not save notification preferences. Please try again."
      ),
    };
  }
}

/** Persist avatar_url for the signed-in user (service role — client RLS can silently block). */
export async function updateAvatarUrl(avatarUrl: string): Promise<{ error?: string }> {
  const parsed = validate(avatarUrlSchema(getSupabaseUrl()), avatarUrl);
  if (!parsed.success) {
    return { error: parsed.error };
  }
  const { url, userId: ownerId } = parsed.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be signed in to update your photo." };
  }

  if (ownerId !== user.id.toLowerCase()) {
    return { error: "Invalid photo URL." };
  }

  try {
    const path = publicObjectPath(url, STORAGE_BUCKETS.AVATARS);
    if (!path) return { error: "Invalid photo URL." };
    await verifyStoredUpload(UPLOAD_RULES.avatar, path, "updateAvatarUrl");

    const admin = createServiceRoleClient();
    const { data, error } = await admin
      .from("users")
      .update({
        avatar_url: url,
        updated_by: user.id,
      })
      .eq("id", user.id)
      .is("deleted_at", null)
      .select("id")
      .maybeSingle();

    if (error) {
      logServerError("updateAvatarUrl", error, { userId: user.id });
      return { error: "Could not save your profile photo. Please try again." };
    }
    if (!data) {
      logServerError("updateAvatarUrl", "No row updated", { userId: user.id });
      return { error: "Could not save your profile photo. Please try again." };
    }
  } catch (err) {
    return {
      error: toPublicMessage(
        "updateAvatarUrl",
        err,
        "Could not save your profile photo. Please try again."
      ),
    };
  }

  revalidateProfileSurfaces();
  return {};
}

export async function removeAvatarUrl(): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be signed in to remove your photo." };
  }

  try {
    const admin = createServiceRoleClient();
    const { data, error } = await admin
      .from("users")
      .update({
        avatar_url: null,
        updated_by: user.id,
      })
      .eq("id", user.id)
      .is("deleted_at", null)
      .select("id")
      .maybeSingle();

    if (error) {
      logServerError("removeAvatarUrl", error, { userId: user.id });
      return { error: "Could not remove your profile photo. Please try again." };
    }
    if (!data) {
      return { error: "Could not remove your profile photo. Please try again." };
    }
  } catch (err) {
    return {
      error: toPublicMessage(
        "removeAvatarUrl",
        err,
        "Could not remove your profile photo. Please try again."
      ),
    };
  }

  revalidateProfileSurfaces();
  return {};
}
