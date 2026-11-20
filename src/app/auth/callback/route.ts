import { NextResponse } from "next/server";
import { resolvePostAuthPath } from "@/lib/auth/portal-access";
import { createClient } from "@/lib/supabase/server";
import { ensureUserProfile } from "@/lib/supabase/provision-user";
import { logServerError } from "@/lib/errors/server";
import { authCallbackSchema } from "@/lib/validations/auth";
import { validate } from "@/lib/validations/parse";

/**
 * Handles Supabase Auth redirects (email confirmation, password recovery, OAuth).
 * Exchanges the auth code for a session and redirects to the target page.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const parsed = validate(authCallbackSchema, {
    code: searchParams.get("code") ?? undefined,
    next: searchParams.get("next") ?? undefined,
  });

  if (parsed.success) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(parsed.data.code);

    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        await ensureUserProfile(user);
        const { data: profile } = await supabase
          .from("users")
          .select("id, role, client_id")
          .eq("id", user.id)
          .single();

        if (profile) {
          const destination = await resolvePostAuthPath(
            supabase,
            profile,
            parsed.data.next ?? "/dashboard"
          );
          return NextResponse.redirect(`${origin}${destination}`);
        }
      }

      return NextResponse.redirect(`${origin}${parsed.data.next ?? "/welcome"}`);
    }
    logServerError("authCallback", error);
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
