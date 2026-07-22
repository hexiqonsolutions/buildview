import { NextResponse } from "next/server";
import { syncMissingUserProfilesFromAuth } from "@/lib/supabase/provision-user";

function isAuthorized(request: Request): boolean {
  const authHeader = request.headers.get("authorization");
  const bearer = authHeader?.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length)
    : null;

  const cronSecret = process.env.CRON_SECRET?.trim();
  if (cronSecret && bearer === cronSecret) {
    return true;
  }

  // Allow Vercel Cron invocations when no explicit secret is set.
  const vercelCron = request.headers.get("x-vercel-cron");
  if (!cronSecret && vercelCron === "1") {
    return true;
  }

  return false;
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

