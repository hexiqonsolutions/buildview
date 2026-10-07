"use server";

import { cookies, headers } from "next/headers";
import { ADMIN_RESTORE_COOKIE, IMPERSONATOR_COOKIE } from "@/lib/auth/impersonation";
import { redirect } from "next/navigation";
import { createClient, getUserProfile } from "@/lib/supabase/server";
import { ensureUserProfile } from "@/lib/supabase/provision-user";
import { authThrottle } from "@/lib/rate-limit/auth";
import {
  forgotPasswordSchema,
  googleSignInSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
} from "@/lib/validations/auth";
import { validateFormData } from "@/lib/validations/parse";

export type AuthActionState = {
  error?: string;
  success?: string;
};

async function getOrigin(): Promise<string> {
  const headersList = await headers();
  const host = headersList.get("x-forwarded-host") ?? headersList.get("host");
  const protocol = headersList.get("x-forwarded-proto") ?? "http";
  if (
    host &&
    /^[A-Za-z0-9.-]{1,253}(:\d{1,5})?$/.test(host) &&
    (protocol === "http" || protocol === "https")
  ) {
    return `${protocol}://${host}`;
  }
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

function withSentence(message: string, extra: string): string {
  const base = message.trim();
  return `${/[.!?]$/.test(base) ? base : `${base}.`} ${extra}`;
}

export async function signIn(
  _prevState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const parsed = validateFormData(loginSchema, formData);

  if (!parsed.success) {
    return { error: parsed.error };
  }

  const throttle = await authThrottle("login", parsed.data.email);
  const wait = await throttle.retryAfter();
  if (wait > 0) {
    return { error: throttle.message(wait) };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    const delay = await throttle.record();
    return {
      error: delay > 0 ? withSentence(error.message, throttle.message(delay)) : error.message,
    };
  }

  await throttle.clearAccount();

  if (data.user) {
    const profileReady = await ensureUserProfile(data.user);
    if (!profileReady) {
      return {
        error:
          "Your account signed in but the profile could not be created. Run the database migrations in Supabase (see README), then try again.",
      };
    }
  }

  const cookieStore = await cookies();
  cookieStore.delete(IMPERSONATOR_COOKIE);
  cookieStore.delete(ADMIN_RESTORE_COOKIE);

  redirect(parsed.data.redirect ?? "/dashboard");
}

export async function signUp(
  _prevState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const parsed = validateFormData(registerSchema, formData);

  if (!parsed.success) {
    return { error: parsed.error };
  }

  const throttle = await authThrottle("signup", parsed.data.email);
  const wait = await throttle.retryAfter();
  if (wait > 0) {
    return { error: throttle.message(wait) };
  }
  await throttle.record();

  const supabase = await createClient();
  const origin = await getOrigin();

  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.fullName },
      emailRedirectTo: `${origin}/auth/callback?next=/dashboard`,
    },
  });

  if (error) {
    return { error: error.message };
  }

  if (data.user && !data.session) {
    return {
      success:
        "Check your email for a confirmation link to complete registration.",
    };
  }

  if (data.user) {
    await ensureUserProfile(data.user);
  }

  redirect("/dashboard");
}

export async function forgotPassword(
  _prevState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const parsed = validateFormData(forgotPasswordSchema, formData);

  if (!parsed.success) {
    return { error: parsed.error };
  }

  const throttle = await authThrottle("passwordReset", parsed.data.email);
  const wait = await throttle.retryAfter();
  if (wait > 0) {
    return { error: throttle.message(wait) };
  }
  await throttle.record();

  const supabase = await createClient();
  const origin = await getOrigin();

  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${origin}/auth/callback?next=/reset-password`,
  });

  if (error) {
    return { error: error.message };
  }

  return {
    success: "Password reset link sent. Check your email inbox.",
  };
}

export async function resetPassword(
  _prevState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const parsed = validateFormData(resetPasswordSchema, formData);

  if (!parsed.success) {
    return { error: parsed.error };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Your reset session has expired. Please request a new link." };
  }

  const throttle = await authThrottle("passwordUpdate", user.id);
  const wait = await throttle.retryAfter();
  if (wait > 0) {
    return { error: throttle.message(wait) };
  }
  await throttle.record();

  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });

  if (error) {
    return { error: error.message };
  }

  redirect("/dashboard");
}

export async function signInWithGoogle(formData: FormData): Promise<void> {
  const parsed = validateFormData(googleSignInSchema, formData);
  if (!parsed.success) {
    redirect("/login?error=google_signin_failed");
  }

  const throttle = await authThrottle("oauth");
  if ((await throttle.retryAfter()) > 0) {
    redirect("/login?error=rate_limited");
  }
  await throttle.record();

  const supabase = await createClient();
  const origin = await getOrigin();
  const redirectTo = parsed.data.redirect ?? "/dashboard";

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(redirectTo)}`,
      queryParams: {
        access_type: "offline",
        prompt: "select_account",
      },
    },
  });

  if (error || !data.url) {
    redirect("/login?error=google_signin_failed");
  }

  redirect(data.url);
}

export async function signOut() {
  const cookieStore = await cookies();
  const impersonating = cookieStore.has(ADMIN_RESTORE_COOKIE);
  const supabase = await createClient();
  // While impersonating, a global sign-out would end the real client's sessions too.
  await supabase.auth.signOut(impersonating ? { scope: "local" } : undefined);
  cookieStore.delete(IMPERSONATOR_COOKIE);
  cookieStore.delete(ADMIN_RESTORE_COOKIE);
  redirect("/login");
}

export async function getCurrentUser() {
  return getUserProfile();
}
