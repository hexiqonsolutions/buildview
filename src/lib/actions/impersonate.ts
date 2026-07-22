"use server";

import { redirect } from "next/navigation";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { requireBuildViewStaff } from "@/lib/supabase/server";
import { canImpersonate } from "@/lib/auth/permissions";
import { isClientPortalRole } from "@/lib/auth/roles";
import { logAuditEvent } from "@/lib/actions/activity";

/**
 * Admin impersonation: generates a magic link for the target client user
 * and redirects the admin into the client portal without a password.
 */
export async function loginAsClientUser(userId: string) {
  const actor = await requireBuildViewStaff();
  if (!canImpersonate(actor.role)) {
    throw new Error("You do not have permission to impersonate users.");
  }

  const admin = createServiceRoleClient();

  const { data: targetUser, error: userError } = await admin
    .from("users")
    .select("id, email, role, is_active")
    .eq("id", userId)
    .is("deleted_at", null)
    .single();

  if (userError || !targetUser) {
    throw new Error("Client user not found.");
  }

  if (!isClientPortalRole(targetUser.role) || !targetUser.is_active) {
    throw new Error("Only active client portal users can be impersonated.");
  }

  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: targetUser.email,
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/auth/callback?next=/dashboard`,
      data: {
        impersonated_by: actor.id,
        impersonated_by_name: actor.full_name ?? actor.email,
        impersonated_target_id: targetUser.id,
        impersonated_target_email: targetUser.email,
      },
    },
  });

  if (linkError || !linkData.properties?.action_link) {
    throw new Error(linkError?.message ?? "Failed to generate client login link.");
  }

  await logAuditEvent({
    action: `Impersonation started for ${targetUser.email}`,
    entityType: "impersonation",
    entityId: targetUser.id,
    userId: actor.id,
    metadata: {
      actor_id: actor.id,
      actor_email: actor.email,
      target_id: targetUser.id,
      target_email: targetUser.email,
    },
  });

  redirect(linkData.properties.action_link);
}
