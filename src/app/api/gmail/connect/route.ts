import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/session";
import { getGmailAuthUrl } from "@/lib/gmail/client";

export async function GET() {
  try {
    const session = await requireAuth();
    const state = Buffer.from(
      JSON.stringify({
        userId: session.user.id,
        organizationId: session.organization.id,
        ts: Date.now(),
      })
    ).toString("base64url");

    const url = getGmailAuthUrl(state);
    return NextResponse.redirect(url);
  } catch (error) {
    console.error(error);
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    return NextResponse.redirect(
      `${appUrl}/email?error=${encodeURIComponent(
        error instanceof Error ? error.message : "Gmail connect failed"
      )}`
    );
  }
}
