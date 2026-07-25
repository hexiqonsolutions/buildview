"use server";

import { revalidatePath } from "next/cache";
import { createClient, getUserProfile } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { updateProfileSchema } from "@/lib/validations/profile";

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
  const parsed = updateProfileSchema.safeParse({
    full_name: formData.get("full_name"),
    phone: formData.get("phone"),
  });

  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? "Invalid profile data" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be signed in to update your profile." };
  }

  const phone = parsed.data.phone?.trim() || null;

  const { error } = await supabase
    .from("users")
    .update({
      full_name: parsed.data.full_name,
      phone,
      updated_by: user.id,
    })
    .eq("id", user.id)
    .is("deleted_at", null);

  if (error) {
    console.error("[updateProfile] failed:", error.message);
    return {
      error:
        "Could not save your profile. If this keeps happening, ask your admin to run migration 005_fix_users_update_rls.sql in Supabase.",
    };
  }

  revalidateProfileSurfaces();

  return { success: "Profile updated successfully." };
}

/** Persist avatar_url for the signed-in user (service role — client RLS can silently block). */
export async function updateAvatarUrl(avatarUrl: string): Promise<{ error?: string }> {
  const url = avatarUrl.trim();
  if (!url || !/^https?:\/\//i.test(url) || url.length > 2000) {
    return { error: "Invalid photo URL." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be signed in to update your photo." };
  }

  try {
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
      console.error("[updateAvatarUrl] failed:", error.message);
      return { error: `Could not save your profile photo: ${error.message}` };
    }
    if (!data) {
      console.error("[updateAvatarUrl] no row updated for", user.id);
      return { error: "Could not save your profile photo. Please try again." };
    }
  } catch (err) {
    console.error("[updateAvatarUrl] exception:", err);
    return {
      error: err instanceof Error ? err.message : "Could not save your profile photo.",
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
      console.error("[removeAvatarUrl] failed:", error.message);
      return { error: `Could not remove your profile photo: ${error.message}` };
    }
    if (!data) {
      return { error: "Could not remove your profile photo. Please try again." };
    }
  } catch (err) {
    console.error("[removeAvatarUrl] exception:", err);
    return {
      error: err instanceof Error ? err.message : "Could not remove your profile photo.",
    };
  }

  revalidateProfileSurfaces();
  return {};
}
