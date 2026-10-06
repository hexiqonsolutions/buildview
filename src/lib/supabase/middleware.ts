import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/lib/types";
import type { UserRole } from "@/lib/types";
import { canAccessAdmin } from "@/lib/auth/permissions";
import {
  getDefaultRedirect,
  getRouteAccess,
  isAuthRoute,
  isProtectedRoute,
  isSessionAuthRoute,
} from "@/lib/auth/routes";
import { getSupabasePublicConfig } from "@/lib/supabase/env";

export {
  AUTH_ROUTES,
  SESSION_AUTH_ROUTES,
  CLIENT_ROUTE_PREFIX,
  ADMIN_ROUTE_PREFIX,
  isAuthRoute,
  isSessionAuthRoute,
  isClientRoute,
  isAdminRoute,
  isProtectedRoute,
} from "@/lib/auth/routes";

interface UserProfile {
  role: UserRole;
  is_active: boolean;
  deleted_at: string | null;
}

/** Carry refreshed/cleared auth cookies onto redirect responses (required by Supabase SSR). */
function redirectWithSessionCookies(
  url: URL | string,
  sessionResponse: NextResponse
): NextResponse {
  return withSessionCookies(NextResponse.redirect(url), sessionResponse);
}

function safeRedirectPath(path: string | null): string {
  if (!path || !path.startsWith("/") || path.startsWith("//")) {
    return "/dashboard";
  }
  if (isAuthRoute(path) || isSessionAuthRoute(path)) {
    return "/dashboard";
  }
  return path;
}

export interface SessionResult {
  response: NextResponse;
  /** Signed-in Supabase user, if any (used for per-user rate limits). */
  userId: string | null;
}

/** Copies refreshed/cleared auth cookies onto a response built outside updateSession. */
export function withSessionCookies(
  response: NextResponse,
  sessionResponse: NextResponse
): NextResponse {
  sessionResponse.cookies.getAll().forEach((cookie) => {
    response.cookies.set(cookie);
  });
  return response;
}

/**
 * Refreshes the Supabase session on every matched request and enforces
 * route-level auth rules. Called from src/middleware.ts.
 */
export async function updateSession(request: NextRequest): Promise<SessionResult> {
  const result = await runSession(request);
  return "response" in result ? result : { response: result, userId: null };
}

async function runSession(request: NextRequest): Promise<SessionResult | NextResponse> {
  let supabaseResponse = NextResponse.next({ request });

  let url: string;
  let anonKey: string;
  try {
    ({ url, anonKey } = getSupabasePublicConfig());
  } catch (error) {
    // Missing env on Vercel causes MIDDLEWARE_INVOCATION_FAILED (500).
    // Fail soft so the site can still load public pages and show a clear signal.
    console.error("[middleware] Supabase env missing:", error);
    const response = NextResponse.next({ request });
    response.headers.set("x-buildview-config-error", "missing-supabase-env");
    return response;
  }

  const supabase = createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(
        cookiesToSet: { name: string; value: string; options: CookieOptions }[]
      ) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  const { pathname } = request.nextUrl;
  const routeAccess = getRouteAccess(pathname);

  // Public routes — refresh session cookies but skip auth checks
  if (routeAccess === "public") {
    let publicUserId: string | null = null;
    try {
      const { data } = await supabase.auth.getUser();
      publicUserId = data.user?.id ?? null;
    } catch (error) {
      console.error("[middleware] public session refresh failed:", error);
    }
    return { response: supabaseResponse, userId: publicUserId };
  }

  let user = null;
  try {
    const result = await supabase.auth.getUser();
    user = result.data.user;
  } catch (error) {
    console.error("[middleware] getUser failed:", error);
  }

  // ── Unauthenticated access ──────────────────────────────────────────────

  if (!user && isProtectedRoute(pathname)) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("redirect", pathname);
    return redirectWithSessionCookies(redirectUrl, supabaseResponse);
  }

  if (!user && isSessionAuthRoute(pathname)) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/forgot-password";
    return redirectWithSessionCookies(redirectUrl, supabaseResponse);
  }

  // ── Authenticated access ────────────────────────────────────────────────

  const profile = user ? await fetchUserProfile(supabase, user.id) : null;

  // Only leave login/register when the app profile is active — prevents redirect loops.
  if (user && isAuthRoute(pathname) && isActiveProfile(profile)) {
    const redirectUrl = request.nextUrl.clone();
    const target = safeRedirectPath(
      request.nextUrl.searchParams.get("redirect")
    );
    redirectUrl.pathname = getDefaultRedirect(profile.role);
    if (target !== "/dashboard") {
      redirectUrl.pathname = target;
    }
    redirectUrl.search = "";
    return redirectWithSessionCookies(redirectUrl, supabaseResponse);
  }

  if (user && isProtectedRoute(pathname)) {
    if (!profile) {
      // Profile is created in server layout/actions on this request.
      return { response: supabaseResponse, userId: user.id };
    }

    if (!isActiveProfile(profile)) {
      await supabase.auth.signOut();
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/login";
      redirectUrl.searchParams.set("error", "account_inactive");
      return redirectWithSessionCookies(redirectUrl, supabaseResponse);
    }

    if (routeAccess === "admin" && !canAccessAdmin(profile.role)) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/dashboard";
      redirectUrl.searchParams.set("error", "unauthorized");
      return redirectWithSessionCookies(redirectUrl, supabaseResponse);
    }

    supabaseResponse.headers.set("x-buildview-user-role", profile.role);
    supabaseResponse.headers.set("x-buildview-user-id", user.id);
  }

  return { response: supabaseResponse, userId: user?.id ?? null };
}

async function fetchUserProfile(
  supabase: ReturnType<typeof createServerClient<Database>>,
  userId: string
): Promise<UserProfile | null> {
  const { data } = await supabase
    .from("users")
    .select("role, is_active, deleted_at")
    .eq("id", userId)
    .single();

  return data;
}

function isActiveProfile(profile: UserProfile | null): profile is UserProfile {
  return (
    profile !== null &&
    profile.deleted_at === null &&
    profile.is_active === true
  );
}

/** Post-login redirect based on role (used by auth actions). */
export { getDefaultRedirect };
