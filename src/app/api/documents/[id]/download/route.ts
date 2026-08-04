import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/session";
import { getDocumentForOrg } from "@/lib/documents/queries";
import { downloadDocumentBytes } from "@/lib/documents/storage";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const session = await requireAuth();
    const { id } = await context.params;
    const document = await getDocumentForOrg({
      organizationId: session.organization.id,
      documentId: id,
    });

    if (!document) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const bytes = await downloadDocumentBytes(document.storagePath);
    return new NextResponse(bytes, {
      status: 200,
      headers: {
        "Content-Type": document.mimeType,
        "Content-Length": String(bytes.byteLength),
        "Content-Disposition": `attachment; filename="${document.name.replace(/"/g, "")}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    console.error("GET /api/documents/[id]/download:", error);
    return NextResponse.json(
      { error: "Could not download document" },
      { status: 500 }
    );
  }
}
