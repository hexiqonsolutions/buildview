"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { createClient, requireBuildViewStaff } from "@/lib/supabase/server";
import { canImpersonate } from "@/lib/auth/permissions";
import { isClientPortalRole } from "@/lib/auth/roles";
import { IMPERSONATOR_COOKIE, IMPERSONATION_MAX_AGE_SECONDS } from "@/lib/auth/impersonation";
import { logAuditEvent } from "@/lib/actions/activity";

/**
 * Admin impersonation: signs the current browser in as the target client user
 * and opens the client portal. The staff session is replaced, so returning to
 * admin requires signing in again.
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
  });

  const tokenHash = linkData?.properties?.hashed_token;
  if (linkError || !tokenHash) {
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

  // Verifying the token server-side writes the client's session cookies directly,
  // so no email redirect URL or /auth/callback round trip is involved.
  const supabase = await createClient();
  const { error: verifyError } = await supabase.auth.verifyOtp({
    type: "magiclink",
    token_hash: tokenHash,
  });

  if (verifyError) {
    throw new Error(`Could not sign in as this client: ${verifyError.message}`);
  }

  const cookieStore = await cookies();
  cookieStore.set(IMPERSONATOR_COOKIE, actor.full_name?.trim() || actor.email, {
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: IMPERSONATION_MAX_AGE_SECONDS,
  });

  redirect("/dashboard");
}

export async function endImpersonation() {
  const supabase = await createClient();
  await supabase.auth.signOut();

  const cookieStore = await cookies();
  cookieStore.delete(IMPERSONATOR_COOKIE);

  redirect("/login?redirect=%2Fadmin%2Fclients");
}
