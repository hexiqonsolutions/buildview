import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ensureUserProfile } from "@/lib/supabase/provision-user";
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
      }
      return NextResponse.redirect(`${origin}${parsed.data.next ?? "/dashboard"}`);
    }
  }

  return NextResponse.redirect(
    `${origin}/login?error=auth_callback_failed`
  );
}
