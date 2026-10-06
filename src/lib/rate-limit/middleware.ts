import { NextResponse, type NextRequest } from "next/server";
import {
  consumeRateLimit,
  formatRetryAfter,
  getClientIp,
  type WindowPolicyName,
} from "@/lib/rate-limit";

/**
 * Request-level limits applied in middleware:
 *   - /auth/callback                       → publicAuthCallback (per IP)
 *   - /api/* and Server Action POSTs, anon → publicApi / publicAction (per IP)
 *   - /api/* and Server Action POSTs, user → authenticated (per user)
 * Page GETs are not limited here. Auth form actions additionally get their own
 * per-IP + per-account backoff inside src/lib/actions/auth.ts.
 */
function classify(
  request: NextRequest,
  userId: string | null
): { policy: WindowPolicyName; identifier: string } | null {
  const { pathname } = request.nextUrl;

  if (pathname === "/auth/callback" || pathname.startsWith("/auth/callback/")) {
    return { policy: "publicAuthCallback", identifier: getClientIp(request.headers) };
  }

  const isApi = pathname.startsWith("/api/");
  const isServerAction = request.method === "POST" && request.headers.has("next-action");
  if (!isApi && !isServerAction) return null;

  if (userId) {
    return { policy: "authenticated", identifier: userId };
  }
  return {
    policy: isApi ? "publicApi" : "publicAction",
    identifier: getClientIp(request.headers),
  };
}

/** Returns a 429 response when the request is over its limit, otherwise null. */
export async function enforceRequestRateLimit(
  request: NextRequest,
  userId: string | null
): Promise<NextResponse | null> {
  const target = classify(request, userId);
  if (!target) return null;

  const decision = await consumeRateLimit(target.policy, target.identifier);
  if (decision.allowed) return null;

  const retryAfter = Math.max(decision.retryAfterSeconds, 1);
  return NextResponse.json(
    {
      error: `Too many requests. Please wait ${formatRetryAfter(retryAfter)} and try again.`,
      retryAfter,
    },
    {
      status: 429,
      headers: { "Retry-After": String(retryAfter), "Cache-Control": "no-store" },
    }
  );
}
