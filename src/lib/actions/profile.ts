"use server";

import { revalidatePath } from "next/cache";
import { createClient, getUserProfile } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { getSupabaseUrl } from "@/lib/supabase/env";
import { logServerError, toPublicMessage } from "@/lib/errors/server";
import { validate, validateFormData } from "@/lib/validations/parse";
import { avatarUrlSchema, updateProfileSchema } from "@/lib/validations/profile";
import { publicObjectPath, UPLOAD_RULES, verifyStoredUpload } from "@/lib/uploads/verify";
import { STORAGE_BUCKETS } from "@/lib/types";

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
