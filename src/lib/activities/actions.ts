"use server";

import { revalidatePath } from "next/cache";
import { MembershipRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/session";
import { activityFormSchema } from "@/lib/activities/schema";

type ActionResult<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

export async function createActivityAction(
  input: unknown
): Promise<ActionResult<{ id: string }>> {
  try {
    const session = await requireRole([
      MembershipRole.OWNER,
      MembershipRole.ADMIN,
      MembershipRole.SALES,
    ]);
    const parsed = activityFormSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues[0]?.message ?? "Invalid activity",
      };
    }

    if (parsed.data.type === "EMAIL") {
      return {
        ok: false,
        error: "Email activities are created from the Email module",
      };
    }

    const occurredAt = new Date(parsed.data.occurredAt);
    if (Number.isNaN(occurredAt.getTime())) {
      return { ok: false, error: "Invalid date/time" };
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

    const created = await prisma.activity.create({
      data: {
        organizationId: session.organization.id,
        actorId: session.user.id,
        type: parsed.data.type,
        title: parsed.data.title,
        body: parsed.data.body || null,
        leadId: parsed.data.leadId || null,
        occurredAt,
      },
    });

    if (parsed.data.leadId && parsed.data.type === "CALL") {
      await prisma.lead.update({
        where: { id: parsed.data.leadId },
        data: { lastContactedAt: occurredAt },
      });
    }

    revalidatePath("/activities");
    revalidatePath("/dashboard");
    revalidatePath("/leads");
    return { ok: true, data: { id: created.id } };
  } catch (error) {
    console.error(error);
    return { ok: false, error: "Failed to log activity" };
  }
}

export async function updateActivityAction(
  id: string,
  input: unknown
): Promise<ActionResult> {
  try {
    const session = await requireRole([
      MembershipRole.OWNER,
      MembershipRole.ADMIN,
      MembershipRole.SALES,
    ]);
    const parsed = activityFormSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues[0]?.message ?? "Invalid activity",
      };
    }

    const existing = await prisma.activity.findFirst({
      where: {
        id,
        organizationId: session.organization.id,
        deletedAt: null,
      },
    });
    if (!existing) return { ok: false, error: "Activity not found" };
    if (existing.type === "EMAIL") {
      return { ok: false, error: "Email activities are read-only here" };
    }

    const occurredAt = new Date(parsed.data.occurredAt);
    if (Number.isNaN(occurredAt.getTime())) {
      return { ok: false, error: "Invalid date/time" };
    }

    await prisma.activity.update({
      where: { id },
      data: {
        type: parsed.data.type === "EMAIL" ? existing.type : parsed.data.type,
        title: parsed.data.title,
        body: parsed.data.body || null,
        leadId: parsed.data.leadId || null,
        occurredAt,
      },
    });

    revalidatePath("/activities");
    revalidatePath("/dashboard");
    return { ok: true };
  } catch (error) {
    console.error(error);
    return { ok: false, error: "Failed to update activity" };
  }
}

export async function deleteActivityAction(id: string): Promise<ActionResult> {
  try {
    const session = await requireRole([
      MembershipRole.OWNER,
      MembershipRole.ADMIN,
      MembershipRole.SALES,
    ]);

    const existing = await prisma.activity.findFirst({
      where: {
        id,
        organizationId: session.organization.id,
        deletedAt: null,
      },
    });
    if (!existing) return { ok: false, error: "Activity not found" };
    if (existing.type === "EMAIL") {
      return { ok: false, error: "Email activities cannot be deleted here" };
    }

    await prisma.activity.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    revalidatePath("/activities");
    revalidatePath("/dashboard");
    return { ok: true };
  } catch (error) {
    console.error(error);
    return { ok: false, error: "Failed to delete activity" };
  }
}
