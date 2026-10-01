"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { createClient, requireBuildViewStaff } from "@/lib/supabase/server";
import { canImpersonate } from "@/lib/auth/permissions";
import { isClientPortalRole } from "@/lib/auth/roles";
import { IMPERSONATOR_COOKIE, IMPERSONATION_MAX_AGE_SECONDS } from "@/lib/auth/impersonation";
import { logAuditEvent } from "@/lib/actions/activity";

export type LoginAsClientResult = { error: string } | undefined;

/**
 * Admin impersonation: signs the current browser in as the target client user
 * and opens the client portal. The staff session is replaced, so returning to
 * admin requires signing in again.
 *
 * Failures are returned rather than thrown so the caller can show them; on
 * success this redirects and never returns.
 */
export async function loginAsClientUser(userId: string): Promise<LoginAsClientResult> {
  const actor = await requireBuildViewStaff();
  if (!canImpersonate(actor.role)) {
    return { error: "You do not have permission to log in as clients." };
  }

  const admin = createServiceRoleClient();

  const { data: targetUser, error: userError } = await admin
    .from("users")
    .select("id, email, role, is_active")
    .eq("id", userId)
    .is("deleted_at", null)
    .single();

  if (userError || !targetUser) {
    return { error: "Client user not found." };
  }

  if (!isClientPortalRole(targetUser.role) || !targetUser.is_active) {
    return { error: "This user is inactive or not a client portal user." };
  }

  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: targetUser.email,
  });

  const tokenHash = linkData?.properties?.hashed_token;
  if (linkError || !tokenHash) {
    return {
      error: `Could not create a login for ${targetUser.email}: ${linkError?.message ?? "no token returned"}`,
    };
  }

  // Logged before the session switch, while the request still runs as staff.
  try {
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
  } catch (err) {
    console.error("[loginAsClientUser] audit log failed:", err);
  }

  // Verifying the token server-side writes the client's session cookies directly,
  // so no email redirect URL or /auth/callback round trip is involved.
  const supabase = await createClient();
  const { error: verifyError } = await supabase.auth.verifyOtp({
    type: "magiclink",
    token_hash: tokenHash,
  });

  if (verifyError) {
    return { error: `Could not sign in as ${targetUser.email}: ${verifyError.message}` };
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
