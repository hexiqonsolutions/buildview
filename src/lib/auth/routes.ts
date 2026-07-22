/**
 * BuildView route protection configuration.
 * Used by middleware and server-side layout guards.
 */

import type { UserRole } from "@/lib/types";
import { canAccessAdmin } from "@/lib/auth/permissions";

/** Marketing and public pages — no authentication required. */
export const PUBLIC_ROUTE_PREFIXES = [
  "/",
  "/about",
  "/services",
  "/projects",
  "/contact",
  "/privacy",
  "/terms",
  "/cookies",
] as const;

/** Auth pages for unauthenticated users (redirect away when signed in). */
export const AUTH_ROUTES = ["/login", "/register", "/forgot-password"] as const;

/** Auth pages that require a valid Supabase session (e.g. password recovery). */
export const SESSION_AUTH_ROUTES = ["/reset-password"] as const;

/** Client portal — requires authenticated, active user. */
export const CLIENT_ROUTE_PREFIX = "/dashboard";

/** Admin panel — requires authenticated BuildView staff. */
export const ADMIN_ROUTE_PREFIX = "/admin";

/** API/auth callback routes that must bypass protection checks. */
export const PUBLIC_API_PREFIXES = ["/auth/callback"] as const;

export type RouteAccess = "public" | "auth" | "session-auth" | "client" | "admin";

export function isPublicApiRoute(pathname: string): boolean {
  return PUBLIC_API_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export function isAuthRoute(pathname: string): boolean {
  return AUTH_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

export function isSessionAuthRoute(pathname: string): boolean {
  return SESSION_AUTH_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );
}

export function isClientRoute(pathname: string): boolean {
  return (
    pathname === CLIENT_ROUTE_PREFIX ||
    pathname.startsWith(`${CLIENT_ROUTE_PREFIX}/`)
  );
}

export function isAdminRoute(pathname: string): boolean {
  return (
    pathname === ADMIN_ROUTE_PREFIX ||
    pathname.startsWith(`${ADMIN_ROUTE_PREFIX}/`)
  );
}

export function isProtectedRoute(pathname: string): boolean {
  return isClientRoute(pathname) || isAdminRoute(pathname);
}

export function isPublicMarketingRoute(pathname: string): boolean {
  if (pathname === "/") return true;
  return PUBLIC_ROUTE_PREFIXES.some(
    (prefix) =>
      prefix !== "/" &&
      (pathname === prefix || pathname.startsWith(`${prefix}/`))
  );
}

export function getRouteAccess(pathname: string): RouteAccess {
  if (isPublicApiRoute(pathname) || isPublicMarketingRoute(pathname)) {
    return "public";
  }
  if (isAuthRoute(pathname)) return "auth";
  if (isSessionAuthRoute(pathname)) return "session-auth";
  if (isAdminRoute(pathname)) return "admin";
  if (isClientRoute(pathname)) return "client";
  return "public";
}

/** Default landing page after sign-in based on role. */
export function getDefaultRedirect(role: UserRole): string {
  return canAccessAdmin(role) ? "/admin" : "/dashboard";
}

/** Where to send a user who lacks permission for a route. */
export function getUnauthorizedRedirect(
  attempted: RouteAccess,
  role: UserRole | null
): string {
  if (!role) return "/login";
  if (attempted === "admin") return "/dashboard";
  if (attempted === "client" && canAccessAdmin(role)) return "/admin";
  return "/login";
}
