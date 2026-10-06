import { type NextRequest } from "next/server";
import { updateSession, withSessionCookies } from "@/lib/supabase/middleware";
import { enforceRequestRateLimit } from "@/lib/rate-limit/middleware";

/**
 * Next.js middleware — runs on every matched request.
 * Delegates session refresh and route protection to updateSession(), then
 * applies request-level rate limits (see src/lib/rate-limit/middleware.ts).
 */
export async function middleware(request: NextRequest) {
  const { response, userId } = await updateSession(request);

  if (response.headers.has("location")) {
    return response;
  }

  const limited = await enforceRequestRateLimit(request, userId);
  return limited ? withSessionCookies(limited, response) : response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico, sitemap.xml, robots.txt
     * - common static image extensions
     */
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
