import { createHash, timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { flushOutbox, runDigest } from "@/lib/notifications/team";

/**
 * Scheduled team notifications (Vercel Cron, Authorization: Bearer $CRON_SECRET).
 *   ?task=flush   send instant WhatsApp held by quiet hours / retries (8 am IST)
 *   ?task=digest  flush, then send each person's digest (1 pm and 7 pm IST)
 */
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function digest(value: string): Buffer {
  return createHash("sha256").update(value).digest();
}

function isAuthorized(request: Request): boolean {
  const cronSecret = process.env.CRON_SECRET?.trim();
  if (!cronSecret) return false;
  const authHeader = request.headers.get("authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) return false;
  return timingSafeEqual(digest(authHeader.slice("Bearer ".length)), digest(cronSecret));
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const task = new URL(request.url).searchParams.get("task") ?? "flush";
  const flushed = await flushOutbox({ limit: 500 });
  const digested = task === "digest" ? await runDigest() : null;
  return NextResponse.json({ ok: true, task, flushed, digested, timestamp: new Date().toISOString() });
}

export async function POST(request: Request) {
  return GET(request);
}
