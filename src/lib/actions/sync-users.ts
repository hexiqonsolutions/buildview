"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isBuildViewStaffRole } from "@/lib/auth/roles";
import {
  syncUserProfilesFromAuthDetailed,
  type SyncUsersResult,
} from "@/lib/supabase/provision-user";

export async function syncUsersFromAuthAction(): Promise<SyncUsersResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return {
      inserted: 0,
      restored: 0,
      authCount: 0,
      profileCount: 0,
      error: "Not signed in",
    };
  }

  const { data: me } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (!me || !isBuildViewStaffRole(me.role)) {
    return {
      inserted: 0,
      restored: 0,
      authCount: 0,
      profileCount: 0,
      error: "Staff access required",
    };
  }

  const result = await syncUserProfilesFromAuthDetailed();
  revalidatePath("/admin/users");
  return result;
}
