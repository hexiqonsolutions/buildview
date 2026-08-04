"use server";

import { revalidatePath } from "next/cache";
import { MembershipRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/session";
import {
  ALLOWED_MIME_TYPES,
  documentMetaSchema,
  inferDocumentType,
  MAX_DOCUMENT_BYTES,
} from "@/lib/documents/schema";
import {
  removeDocumentFile,
  uploadDocumentFile,
} from "@/lib/documents/storage";

type ActionResult<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

function revalidateDocuments() {
  revalidatePath("/documents");
  revalidatePath("/dashboard");
  revalidatePath("/activities");
  revalidatePath("/leads");
}

export async function uploadDocumentAction(
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  try {
    const session = await requireRole([
      MembershipRole.OWNER,
      MembershipRole.ADMIN,
      MembershipRole.SALES,
    ]);

    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) {
      return { ok: false, error: "Choose a file to upload" };
    }
    if (file.size > MAX_DOCUMENT_BYTES) {
      return { ok: false, error: "File must be 25 MB or smaller" };
    }

    const mimeType = file.type || "application/octet-stream";
    if (!ALLOWED_MIME_TYPES.has(mimeType)) {
      return {
        ok: false,
        error: "Unsupported file type. Use PDF, Office, CSV, or image files.",
      };
    }

    const parsed = documentMetaSchema.safeParse({
      name: formData.get("name") || file.name,
      type: formData.get("type") || inferDocumentType(mimeType),
      leadId: formData.get("leadId") || undefined,
    });
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues[0]?.message ?? "Invalid document",
      };
    }

    if (parsed.data.leadId) {
      const lead = await prisma.lead.findFirst({
        where: {
          id: parsed.data.leadId,
          organizationId: session.organization.id,
          deletedAt: null,
        },
      });
      if (!lead) return { ok: false, error: "Lead not found" };
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const storagePath = await uploadDocumentFile({
      organizationId: session.organization.id,
      fileName: file.name,
      mimeType,
      bytes,
    });

    try {
      const created = await prisma.$transaction(async (tx) => {
        const document = await tx.document.create({
          data: {
            organizationId: session.organization.id,
            leadId: parsed.data.leadId || null,
            uploadedById: session.user.id,
            name: parsed.data.name,
            type: parsed.data.type,
            mimeType,
            sizeBytes: file.size,
            storagePath,
          },
        });

        await tx.activity.create({
          data: {
            organizationId: session.organization.id,
            leadId: parsed.data.leadId || null,
            actorId: session.user.id,
            type: "NOTE",
            title: `Document uploaded: ${document.name}`,
            body: `${document.type} · ${(file.size / 1024).toFixed(1)} KB`,
            occurredAt: new Date(),
          },
        });

        return document;
      });

      revalidateDocuments();
      return { ok: true, data: { id: created.id } };
    } catch (error) {
      await removeDocumentFile(storagePath).catch(() => undefined);
      throw error;
    }
  } catch (error) {
    console.error("uploadDocumentAction:", error);
    return {
      ok: false,
      error:
        error instanceof Error ? error.message : "Could not upload document",
    };
  }
}

export async function updateDocumentAction(
  documentId: string,
  input: unknown
): Promise<ActionResult> {
  try {
    const session = await requireRole([
      MembershipRole.OWNER,
      MembershipRole.ADMIN,
      MembershipRole.SALES,
    ]);
    const parsed = documentMetaSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues[0]?.message ?? "Invalid document",
      };
    }

    const existing = await prisma.document.findFirst({
      where: {
        id: documentId,
        organizationId: session.organization.id,
        deletedAt: null,
      },
    });
    if (!existing) return { ok: false, error: "Document not found" };

    if (parsed.data.leadId) {
      const lead = await prisma.lead.findFirst({
        where: {
          id: parsed.data.leadId,
          organizationId: session.organization.id,
          deletedAt: null,
        },
      });
      if (!lead) return { ok: false, error: "Lead not found" };
    }

    await prisma.document.update({
      where: { id: existing.id },
      data: {
        name: parsed.data.name,
        type: parsed.data.type,
        leadId: parsed.data.leadId || null,
      },
    });

    revalidateDocuments();
    return { ok: true };
  } catch (error) {
    console.error("updateDocumentAction:", error);
    return { ok: false, error: "Could not update document" };
  }
}

export async function deleteDocumentAction(
  documentId: string
): Promise<ActionResult> {
  try {
    const session = await requireRole([
      MembershipRole.OWNER,
      MembershipRole.ADMIN,
      MembershipRole.SALES,
    ]);

    const existing = await prisma.document.findFirst({
      where: {
        id: documentId,
        organizationId: session.organization.id,
        deletedAt: null,
      },
    });
    if (!existing) return { ok: false, error: "Document not found" };

    await prisma.document.update({
      where: { id: existing.id },
      data: { deletedAt: new Date() },
    });

    await removeDocumentFile(existing.storagePath).catch((error) => {
      console.error("deleteDocumentAction storage cleanup:", error);
    });

    revalidateDocuments();
    return { ok: true };
  } catch (error) {
    console.error("deleteDocumentAction:", error);
    return { ok: false, error: "Could not delete document" };
  }
}
