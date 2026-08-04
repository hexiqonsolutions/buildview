import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getTrackingPixelBuffer,
  hashIp,
} from "@/lib/email/tracking";

type RouteContext = {
  params: Promise<{ token: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  const pixel = getTrackingPixelBuffer();
  const headers = {
    "Content-Type": "image/gif",
    "Content-Length": String(pixel.byteLength),
    "Cache-Control": "no-store, no-cache, must-revalidate, private",
    Pragma: "no-cache",
  };

  try {
    const { token: raw } = await context.params;
    const token = raw.replace(/\.gif$/i, "").trim();
    if (!token) {
      return new NextResponse(pixel, { status: 200, headers });
    }

    const message = await prisma.emailMessage.findFirst({
      where: {
        trackingToken: token,
        deletedAt: null,
        status: "SENT",
        direction: "OUTBOUND",
      },
      select: { id: true, openCount: true, firstOpenedAt: true },
    });

    if (message) {
      const now = new Date();
      const ua = request.headers.get("user-agent")?.slice(0, 300) || null;
      const forwarded = request.headers.get("x-forwarded-for");
      const ip =
        forwarded?.split(",")[0]?.trim() ||
        request.headers.get("x-real-ip") ||
        null;

      await prisma.$transaction([
        prisma.emailMessage.update({
          where: { id: message.id },
          data: {
            openCount: { increment: 1 },
            firstOpenedAt: message.firstOpenedAt ?? now,
            lastOpenedAt: now,
          },
        }),
        prisma.emailOpenEvent.create({
          data: {
            messageId: message.id,
            openedAt: now,
            userAgent: ua,
            ipHash: hashIp(ip),
          },
        }),
      ]);
    }
  } catch (error) {
    console.error("email tracking pixel:", error);
  }

  // Always return a pixel so email clients don't retry forever.
  return new NextResponse(pixel, { status: 200, headers });
}
