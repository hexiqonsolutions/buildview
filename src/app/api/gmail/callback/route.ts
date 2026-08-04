import { NextResponse } from "next/server";
import { google } from "googleapis";
import { prisma } from "@/lib/prisma";
import { encryptSecret } from "@/lib/crypto/secrets";
import { getGoogleOAuthClient } from "@/lib/gmail/client";

export async function GET(request: Request) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const oauthError = searchParams.get("error");

  if (oauthError) {
    return NextResponse.redirect(
      `${appUrl}/email?error=${encodeURIComponent(oauthError)}`
    );
  }

  if (!code || !state) {
    return NextResponse.redirect(`${appUrl}/email?error=missing_code`);
  }

  try {
    const parsed = JSON.parse(
      Buffer.from(state, "base64url").toString("utf8")
    ) as { userId: string; organizationId: string };

    const oauth = getGoogleOAuthClient();
    const { tokens } = await oauth.getToken(code);
    oauth.setCredentials(tokens);

    const oauth2 = google.oauth2({ version: "v2", auth: oauth });
    const profile = await oauth2.userinfo.get();
    const email = profile.data.email;
    if (!email || !tokens.access_token) {
      throw new Error("Could not read Gmail profile");
    }

    await prisma.emailAccount.upsert({
      where: {
        organizationId_email: {
          organizationId: parsed.organizationId,
          email,
        },
      },
      update: {
        userId: parsed.userId,
        accessTokenEnc: encryptSecret(tokens.access_token),
        refreshTokenEnc: tokens.refresh_token
          ? encryptSecret(tokens.refresh_token)
          : undefined,
        tokenExpiresAt: tokens.expiry_date
          ? new Date(tokens.expiry_date)
          : null,
        isActive: true,
        deletedAt: null,
        provider: "gmail",
      },
      create: {
        organizationId: parsed.organizationId,
        userId: parsed.userId,
        email,
        provider: "gmail",
        accessTokenEnc: encryptSecret(tokens.access_token),
        refreshTokenEnc: tokens.refresh_token
          ? encryptSecret(tokens.refresh_token)
          : null,
        tokenExpiresAt: tokens.expiry_date
          ? new Date(tokens.expiry_date)
          : null,
      },
    });

    return NextResponse.redirect(`${appUrl}/email?connected=1`);
  } catch (error) {
    console.error(error);
    return NextResponse.redirect(
      `${appUrl}/email?error=${encodeURIComponent(
        error instanceof Error ? error.message : "oauth_failed"
      )}`
    );
  }
}
