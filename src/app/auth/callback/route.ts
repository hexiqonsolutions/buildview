import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ensureUserBootstrap } from "@/lib/auth/bootstrap";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user?.email) {
      try {
        await ensureUserBootstrap({
          id: data.user.id,
          email: data.user.email,
          fullName:
            (data.user.user_metadata?.full_name as string | undefined) ??
            (data.user.user_metadata?.name as string | undefined) ??
            null,
          avatarUrl:
            (data.user.user_metadata?.avatar_url as string | undefined) ??
            (data.user.user_metadata?.picture as string | undefined) ??
            null,
        });
      } catch (bootstrapError) {
        console.error("Auth bootstrap failed:", bootstrapError);
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
