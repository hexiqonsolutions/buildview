"use server";

import { revalidatePath } from "next/cache";
import { MembershipRole, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireRole } from "@/lib/auth/session";
import {
  bulkUpdateSchema,
  leadFiltersSchema,
  leadFormSchema,
  type LeadFormValues,
} from "@/lib/leads/schema";
import { listLeadsForExport } from "@/lib/leads/queries";

type ActionResult<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

function parseOptionalDate(value?: string) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

async function syncTags(
  tx: Prisma.TransactionClient,
  organizationId: string,
  leadId: string,
  tagNames: string[]
) {
  const unique = Array.from(
    new Set(tagNames.map((name) => name.trim()).filter(Boolean))
  );

  await tx.leadTag.deleteMany({ where: { leadId } });

  for (const name of unique) {
    const tag = await tx.tag.upsert({
      where: {
        organizationId_name: { organizationId, name },
      },
      update: { deletedAt: null },
      create: {
        organizationId,
        name,
        color: "#F97316",
      },
    });

    await tx.leadTag.create({
      data: { leadId, tagId: tag.id },
    });
  }
}

function toLeadData(values: LeadFormValues, ownerId: string) {
  return {
    company: values.company,
    contactName: values.contactName,
    email: values.email || null,
    phone: values.phone || null,
    whatsapp: values.whatsapp || null,
    linkedin: values.linkedin || null,
    website: values.website || null,
    industry: values.industry || null,
    location: values.location || null,
    designation: values.designation || null,
    leadSource: values.leadSource || null,
    priority: values.priority,
    status: values.status,
    projectType: values.projectType || null,
    budget:
      values.budget === undefined ? null : new Prisma.Decimal(values.budget),
    expectedRevenue:
      values.expectedRevenue === undefined
        ? null
        : new Prisma.Decimal(values.expectedRevenue),
    notes: values.notes || null,
    nextFollowUpAt: parseOptionalDate(values.nextFollowUpAt),
    lastContactedAt: parseOptionalDate(values.lastContactedAt),
    ownerId,
  };
}

export async function createLeadAction(
  input: unknown
): Promise<ActionResult<{ id: string }>> {
  try {
    const session = await requireRole([
      MembershipRole.OWNER,
      MembershipRole.ADMIN,
      MembershipRole.SALES,
    ]);
    const parsed = leadFormSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid lead" };
    }

    const lead = await prisma.$transaction(async (tx) => {
      const created = await tx.lead.create({
        data: {
          organizationId: session.organization.id,
          ...toLeadData(parsed.data, session.user.id),
        },
      });

      await syncTags(
        tx,
        session.organization.id,
        created.id,
        parsed.data.tags
      );

      await tx.activity.create({
        data: {
          organizationId: session.organization.id,
          leadId: created.id,
          actorId: session.user.id,
          type: "NOTE",
          title: "Lead created",
          body: `${created.contactName} at ${created.company}`,
        },
      });

      await tx.auditLog.create({
        data: {
          organizationId: session.organization.id,
          actorId: session.user.id,
          action: "lead.created",
          entityType: "lead",
          entityId: created.id,
        },
      });

      return created;
    });

    revalidatePath("/leads");
    revalidatePath("/dashboard");
    return { ok: true, data: { id: lead.id } };
  } catch (error) {
    console.error(error);
    return { ok: false, error: "Failed to create lead" };
  }
}

export async function updateLeadAction(
  leadId: string,
  input: unknown
): Promise<ActionResult> {
  try {
    const session = await requireRole([
      MembershipRole.OWNER,
      MembershipRole.ADMIN,
      MembershipRole.SALES,
    ]);
    const parsed = leadFormSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid lead" };
    }

    const existing = await prisma.lead.findFirst({
      where: {
        id: leadId,
        organizationId: session.organization.id,
        deletedAt: null,
      },
    });
    if (!existing) return { ok: false, error: "Lead not found" };

    await prisma.$transaction(async (tx) => {
      await tx.lead.update({
        where: { id: leadId },
        data: toLeadData(parsed.data, existing.ownerId ?? session.user.id),
      });

      await syncTags(
        tx,
        session.organization.id,
        leadId,
        parsed.data.tags
      );

      await tx.auditLog.create({
        data: {
          organizationId: session.organization.id,
          actorId: session.user.id,
          action: "lead.updated",
          entityType: "lead",
          entityId: leadId,
        },
      });
    });

    revalidatePath("/leads");
    revalidatePath("/dashboard");
    return { ok: true };
  } catch (error) {
    console.error(error);
    return { ok: false, error: "Failed to update lead" };
  }
}

export async function bulkUpdateLeadsAction(
  input: unknown
): Promise<ActionResult<{ count: number }>> {
  try {
    const session = await requireRole([
      MembershipRole.OWNER,
      MembershipRole.ADMIN,
      MembershipRole.SALES,
    ]);
    const parsed = bulkUpdateSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: "Invalid bulk update payload" };
    }

    const { ids, status, priority, softDelete } = parsed.data;
    if (!status && !priority && !softDelete) {
      return { ok: false, error: "Choose a bulk action" };
    }

    const result = await prisma.lead.updateMany({
      where: {
        id: { in: ids },
        organizationId: session.organization.id,
        deletedAt: null,
      },
      data: {
        ...(status ? { status } : {}),
        ...(priority ? { priority } : {}),
        ...(softDelete ? { deletedAt: new Date() } : {}),
      },
    });

    await prisma.auditLog.create({
      data: {
        organizationId: session.organization.id,
        actorId: session.user.id,
        action: softDelete ? "lead.bulk_deleted" : "lead.bulk_updated",
        entityType: "lead",
        metadata: { ids, status, priority, softDelete },
      },
    });

    revalidatePath("/leads");
    revalidatePath("/dashboard");
    return { ok: true, data: { count: result.count } };
  } catch (error) {
    console.error(error);
    return { ok: false, error: "Bulk update failed" };
  }
}

export async function importLeadsAction(
  rows: unknown[]
): Promise<ActionResult<{ imported: number; failed: number }>> {
  try {
    const session = await requireRole([
      MembershipRole.OWNER,
      MembershipRole.ADMIN,
      MembershipRole.SALES,
    ]);

    let imported = 0;
    let failed = 0;

    for (const row of rows) {
      const parsed = leadFormSchema.safeParse(row);
      if (!parsed.success) {
        failed += 1;
        continue;
      }

      await prisma.$transaction(async (tx) => {
        const created = await tx.lead.create({
          data: {
            organizationId: session.organization.id,
            ...toLeadData(parsed.data, session.user.id),
          },
        });
        await syncTags(
          tx,
          session.organization.id,
          created.id,
          parsed.data.tags
        );
      });
      imported += 1;
    }

    await prisma.auditLog.create({
      data: {
        organizationId: session.organization.id,
        actorId: session.user.id,
        action: "lead.imported",
        entityType: "lead",
        metadata: { imported, failed },
      },
    });

    revalidatePath("/leads");
    revalidatePath("/dashboard");
    return { ok: true, data: { imported, failed } };
  } catch (error) {
    console.error(error);
    return { ok: false, error: "Import failed" };
  }
}

export async function exportLeadsAction(filtersInput: unknown) {
  const session = await requireAuth();
  const parsed = leadFiltersSchema.safeParse(filtersInput ?? {});
  const filters = parsed.success ? parsed.data : { page: 1, pageSize: 20 };
  const items = await listLeadsForExport(session.organization.id, filters);
  return items.map((lead) => ({
    company: lead.company,
    contactName: lead.contactName,
    email: lead.email ?? "",
    phone: lead.phone ?? "",
    whatsapp: lead.whatsapp ?? "",
    linkedin: lead.linkedin ?? "",
    website: lead.website ?? "",
    industry: lead.industry ?? "",
    location: lead.location ?? "",
    designation: lead.designation ?? "",
    leadSource: lead.leadSource ?? "",
    priority: lead.priority,
    status: lead.status,
    projectType: lead.projectType ?? "",
    budget: lead.budget ?? "",
    expectedRevenue: lead.expectedRevenue ?? "",
    notes: lead.notes ?? "",
    tags: lead.tags.map((tag) => tag.name).join("|"),
    nextFollowUpAt: lead.nextFollowUpAt ?? "",
    lastContactedAt: lead.lastContactedAt ?? "",
  }));
}
