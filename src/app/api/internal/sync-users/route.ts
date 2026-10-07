import { createHash, timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { syncMissingUserProfilesFromAuth } from "@/lib/supabase/provision-user";

function digest(value: string): Buffer {
  return createHash("sha256").update(value).digest();
}

/**
 * Requires `Authorization: Bearer $CRON_SECRET` (Vercel Cron sends this automatically
 * when CRON_SECRET is set). Headers like x-vercel-cron are client-controlled, so the
 * endpoint stays closed when no secret is configured.
 */
function isAuthorized(request: Request): boolean {
  const cronSecret = process.env.CRON_SECRET?.trim();
  if (!cronSecret) return false;

  const authHeader = request.headers.get("authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) return false;
  const bearer = authHeader.slice("Bearer ".length);

  return timingSafeEqual(digest(bearer), digest(cronSecret));
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const synced = await syncMissingUserProfilesFromAuth();
  return NextResponse.json({
    ok: true,
    synced,
    timestamp: new Date().toISOString(),
  });
}

export async function POST(request: Request) {
  return GET(request);
}
