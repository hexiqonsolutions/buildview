import { createHash } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import {
  analyticsEvents,
  type AnalyticsEventName,
} from "@/lib/analytics/events";

const PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID ?? "";
const ACCESS_TOKEN = process.env.META_CAPI_ACCESS_TOKEN ?? "";
const TEST_EVENT_CODE = process.env.META_CAPI_TEST_EVENT_CODE ?? "";

const allowedEvents = new Set<string>(Object.values(analyticsEvents));

const metaEventMap: Record<AnalyticsEventName, string> = {
  PageView: "PageView",
  ViewContent: "ViewContent",
  Lead: "Lead",
  Contact: "Contact",
  BookDemo: "BookDemo",
  SignUp: "CompleteRegistration",
  CtaClick: "CtaClick",
};

function sha256(value: string): string {
  return createHash("sha256").update(value.trim().toLowerCase()).digest("hex");
}

function firstIp(request: NextRequest): string | undefined {
  const forwarded = request.headers.get("x-forwarded-for");
  if (!forwarded) return undefined;
  return forwarded.split(",")[0]?.trim() || undefined;
}

export async function POST(request: NextRequest) {
  if (!PIXEL_ID || !ACCESS_TOKEN) {
    return new NextResponse(null, { status: 204 });
  }

  let body: {
    eventName?: string;
    eventId?: string;
    eventSourceUrl?: string;
    params?: Record<string, unknown>;
    email?: string;
  };

  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const eventName = body.eventName;
  if (!eventName || !allowedEvents.has(eventName)) {
    return NextResponse.json({ error: "Unsupported event" }, { status: 400 });
  }

  const mappedName = metaEventMap[eventName as AnalyticsEventName];
  const userAgent = request.headers.get("user-agent") ?? undefined;
  const clientIp = firstIp(request);
  const fbp = request.cookies.get("_fbp")?.value;
  const fbc = request.cookies.get("_fbc")?.value;

  const userData: Record<string, unknown> = {};
  if (body.email && typeof body.email === "string") {
    userData.em = [sha256(body.email)];
  }
  if (clientIp) userData.client_ip_address = clientIp;
  if (userAgent) userData.client_user_agent = userAgent;
  if (fbp) userData.fbp = fbp;
  if (fbc) userData.fbc = fbc;

  const customData: Record<string, unknown> = {};
  if (body.params) {
    for (const [key, value] of Object.entries(body.params)) {
      if (typeof value === "string" || typeof value === "number") {
        customData[key] = value;
      }
    }
  }

  const payload = {
    data: [
      {
        event_name: mappedName,
        event_time: Math.floor(Date.now() / 1000),
        event_id: body.eventId,
        event_source_url: body.eventSourceUrl,
        action_source: "website",
        user_data: userData,
        custom_data: customData,
      },
    ],
    ...(TEST_EVENT_CODE ? { test_event_code: TEST_EVENT_CODE } : {}),
  };

  const graphUrl = `https://graph.facebook.com/v21.0/${PIXEL_ID}/events?access_token=${encodeURIComponent(ACCESS_TOKEN)}`;

  try {
    const response = await fetch(graphUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      return NextResponse.json({ ok: false }, { status: 502 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 502 });
  }
}
