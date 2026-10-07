import { createHash } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { type AnalyticsEventName } from "@/lib/analytics/events";
import { metaEventBodySchema } from "@/lib/validations/analytics";
import { validate } from "@/lib/validations/parse";

const PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID ?? "";
const ACCESS_TOKEN = process.env.META_CAPI_ACCESS_TOKEN ?? "";
const TEST_EVENT_CODE = process.env.META_CAPI_TEST_EVENT_CODE ?? "";
const MAX_BODY_BYTES = 16 * 1024;

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

  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (contentLength > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "Request body too large" }, { status: 413 });
  }

  let raw: string;
  try {
    raw = await request.text();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  if (raw.length > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "Request body too large" }, { status: 413 });
  }

  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = validate(metaEventBodySchema, json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }
  const body = parsed.data;

  const mappedName = metaEventMap[body.eventName as AnalyticsEventName];
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
    // In the body rather than the query string so the token never lands in URL logs.
    access_token: ACCESS_TOKEN,
  };

  const graphUrl = `https://graph.facebook.com/v21.0/${encodeURIComponent(PIXEL_ID)}/events`;

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
