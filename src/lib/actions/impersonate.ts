"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { createClient, requireBuildViewStaff } from "@/lib/supabase/server";
import { canImpersonate } from "@/lib/auth/permissions";
import { isClientPortalRole } from "@/lib/auth/roles";
import {
  ADMIN_RESTORE_COOKIE,
  IMPERSONATOR_COOKIE,
  IMPERSONATION_MAX_AGE_SECONDS,
} from "@/lib/auth/impersonation";
import { logAuditEvent } from "@/lib/activity/audit";
import { toPublicMessage } from "@/lib/errors/server";
import { validate } from "@/lib/validations/parse";
import { text, uuid } from "@/lib/validations/primitives";

const refreshTokenSchema = text("Refresh token", {
  max: 2048,
  pattern: /^[A-Za-z0-9._~+/=-]+$/,
});

export type LoginAsClientResult = { error: string } | undefined;

/**
 * Super admin impersonation: signs the current browser in as the target client
 * user and opens the client portal. The super admin's refresh token is kept in an
 * httpOnly cookie so endImpersonation can restore their session.
 *
 * Failures are returned rather than thrown so the caller can show them; on
 * success this redirects and never returns.
 */
export async function loginAsClientUser(userId: string): Promise<LoginAsClientResult> {
  const parsedUserId = validate(uuid("User ID"), userId);
  if (!parsedUserId.success) {
    return { error: parsedUserId.error };
  }

  const actor = await requireBuildViewStaff();
  if (!canImpersonate(actor.role)) {
    return { error: "Only Super Admins can log in as a client." };
  }

  const admin = createServiceRoleClient();

  const { data: targetUser, error: userError } = await admin
    .from("users")
    .select("id, email, role, is_active")
    .eq("id", parsedUserId.data)
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
      error: toPublicMessage(
        "loginAsClientUser",
        linkError,
        `Could not create a login for ${targetUser.email}.`
      ),
    };
  }

  // Logged before the session switch, while the request still runs as staff.
  try {
    await logAuditEvent({
      action: `Impersonation started for ${targetUser.email}`,
      entityType: "impersonation",
      entityId: targetUser.id,
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

  const supabase = await createClient();
  const {
    data: { session: adminSession },
  } = await supabase.auth.getSession();
  const adminRefreshToken = adminSession?.refresh_token;
  if (!adminRefreshToken) {
    return { error: "Your admin session has expired. Sign in again and retry." };
  }

  // Verifying the token server-side writes the client's session cookies directly,
  // so no email redirect URL or /auth/callback round trip is involved. The admin
  // session is replaced in the browser but not revoked, so it can be restored.
  const { error: verifyError } = await supabase.auth.verifyOtp({
    type: "magiclink",
    token_hash: tokenHash,
  });

  if (verifyError) {
    return {
      error: toPublicMessage(
        "loginAsClientUser",
        verifyError,
        `Could not sign in as ${targetUser.email}.`
      ),
    };
  }

  const cookieStore = await cookies();
  const cookieOptions = {
    path: "/",
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    maxAge: IMPERSONATION_MAX_AGE_SECONDS,
  };
  cookieStore.set(IMPERSONATOR_COOKIE, actor.full_name?.trim() || actor.email, cookieOptions);
  cookieStore.set(ADMIN_RESTORE_COOKIE, adminRefreshToken, { ...cookieOptions, httpOnly: true });

  redirect("/dashboard");
}

/** Ends the client session and restores the super admin who started it. */
export async function endImpersonation() {
  const cookieStore = await cookies();
  const restoreCookie = cookieStore.get(ADMIN_RESTORE_COOKIE)?.value;
  const parsedToken = restoreCookie ? validate(refreshTokenSchema, restoreCookie) : null;
  const adminRefreshToken = parsedToken?.success ? parsedToken.data : undefined;

  const supabase = await createClient();
  // Local scope: a global sign-out would also log the real client out on their own devices.
  await supabase.auth.signOut({ scope: "local" });
  cookieStore.delete(IMPERSONATOR_COOKIE);
  cookieStore.delete(ADMIN_RESTORE_COOKIE);

  if (adminRefreshToken) {
    const { data, error } = await supabase.auth.refreshSession({
      refresh_token: adminRefreshToken,
    });

    if (!error && data.user) {
      const { data: profile } = await createServiceRoleClient()
        .from("users")
        .select("role, is_active")
        .eq("id", data.user.id)
        .is("deleted_at", null)
        .maybeSingle();

      if (profile?.is_active && canImpersonate(profile.role)) {
        redirect("/admin/clients");
      }

      await supabase.auth.signOut({ scope: "local" });
    }
  }

  redirect("/login?redirect=%2Fadmin%2Fclients");
}
