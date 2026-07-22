"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getUserProfile } from "@/lib/supabase/server";
import { updateProfileSchema } from "@/lib/validations/profile";

export type ProfileActionState = {
  error?: string;
  success?: string;
};

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

  revalidatePath("/dashboard/profile");
  revalidatePath("/dashboard");
  revalidatePath("/admin");

  return { success: "Profile updated successfully." };
}
