import { NextResponse } from "next/server";
import { getInvitePreview } from "@/lib/settings/queries";

type RouteContext = {
  params: Promise<{ token: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { token } = await context.params;
    const preview = await getInvitePreview(token);
    if (!preview) {
      return NextResponse.json({ error: "Invalid or expired invite" }, { status: 404 });
    }
    return NextResponse.json(preview);
  } catch (error) {
    console.error("GET /api/invites/[token]:", error);
    return NextResponse.json({ error: "Could not load invite" }, { status: 500 });
  }
}
