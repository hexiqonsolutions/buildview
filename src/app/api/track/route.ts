import { NextResponse } from "next/server";
import { consumeRateLimit, getClientIp } from "@/lib/rate-limit";
import {
  recordPageView,
  recordShareHeartbeat,
  recordShareOpen,
  recordSiteEvent,
  recordSiteHeartbeat,
} from "@/lib/analytics/record";

/**
 * First-party analytics beacon. Accepts JSON or text/plain (sendBeacon).
 * Always answers quickly; failures are swallowed so pages never notice.
 */
export const dynamic = "force-dynamic";

type Body = Record<string, unknown> & { t?: string };

async function readBody(request: Request): Promise<Body | null> {
  try {
    const text = await request.text();
    if (!text || text.length > 4000) return null;
    const parsed = JSON.parse(text) as unknown;
    return parsed && typeof parsed === "object" ? (parsed as Body) : null;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  const limit = await consumeRateLimit("publicApi", getClientIp(request.headers));
  if (!limit.allowed) return NextResponse.json({ ok: false }, { status: 429 });

  const body = await readBody(request);
  if (!body?.t) return NextResponse.json({ ok: false }, { status: 400 });

  switch (body.t) {
    case "share_open": {
      const visitId = await recordShareOpen({ token: body.token, vid: body.vid, referrer: body.referrer }, request.headers);
      return NextResponse.json({ ok: true, visitId });
    }
    case "share_hb":
      await recordShareHeartbeat({ visitId: body.visitId, vid: body.vid, seconds: body.seconds });
      return NextResponse.json({ ok: true });
    case "page_view": {
      const ids = await recordPageView(
        { vid: body.vid, returning: body.returning, path: body.path, search: body.search, referrer: body.referrer },
        request.headers
      );
      return NextResponse.json({ ok: true, ...(ids ?? {}) });
    }
    case "site_hb":
      await recordSiteHeartbeat({ visitId: body.visitId, eventId: body.eventId, vid: body.vid, seconds: body.seconds });
      return NextResponse.json({ ok: true });
    case "event":
      await recordSiteEvent({ visitId: body.visitId, vid: body.vid, name: body.name, path: body.path });
      return NextResponse.json({ ok: true });
    default:
      return NextResponse.json({ ok: false }, { status: 400 });
  }
}
