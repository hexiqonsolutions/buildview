"use server";

import { revalidatePath } from "next/cache";
import { FollowUpStatus, MembershipRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireRole } from "@/lib/auth/session";
import {
  followUpFormSchema,
  followUpStatusSchema,
} from "@/lib/follow-ups/schema";
import { getReminderCandidates } from "@/lib/follow-ups/queries";

type ActionResult<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

export async function createFollowUpAction(
  input: unknown
): Promise<ActionResult<{ id: string }>> {
  try {
    const session = await requireRole([
      MembershipRole.OWNER,
      MembershipRole.ADMIN,
      MembershipRole.SALES,
    ]);
    const parsed = followUpFormSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues[0]?.message ?? "Invalid follow-up",
      };
    }

    const dueAt = new Date(parsed.data.dueAt);
    if (Number.isNaN(dueAt.getTime())) {
      return { ok: false, error: "Invalid due date" };
    }

    const lead = await prisma.lead.findFirst({
      where: {
        id: parsed.data.leadId,
        organizationId: session.organization.id,
        deletedAt: null,
      },
    });
    if (!lead) return { ok: false, error: "Lead not found" };

    const created = await prisma.$transaction(async (tx) => {
      const followUp = await tx.followUp.create({
        data: {
          organizationId: session.organization.id,
          leadId: parsed.data.leadId,
          title: parsed.data.title,
          notes: parsed.data.notes || null,
          dueAt,
          assigneeId: parsed.data.assigneeId || session.user.id,
          status: FollowUpStatus.PENDING,
        },
      });

      await tx.lead.update({
        where: { id: lead.id },
        data: { nextFollowUpAt: dueAt },
      });

      await tx.activity.create({
        data: {
          organizationId: session.organization.id,
          leadId: lead.id,
          actorId: session.user.id,
          type: "TASK",
          title: `Follow-up scheduled: ${followUp.title}`,
          body: parsed.data.notes || null,
          occurredAt: new Date(),
        },
      });

      return followUp;
    });

    revalidatePath("/follow-ups");
    revalidatePath("/dashboard");
    revalidatePath("/leads");
    return { ok: true, data: { id: created.id } };
  } catch (error) {
    console.error(error);
    return { ok: false, error: "Failed to create follow-up" };
  }
}

export async function updateFollowUpAction(
  id: string,
  input: unknown
): Promise<ActionResult> {
  try {
    const session = await requireRole([
      MembershipRole.OWNER,
      MembershipRole.ADMIN,
      MembershipRole.SALES,
    ]);
    const parsed = followUpFormSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues[0]?.message ?? "Invalid follow-up",
      };
    }

    const dueAt = new Date(parsed.data.dueAt);
    if (Number.isNaN(dueAt.getTime())) {
      return { ok: false, error: "Invalid due date" };
    }

    const existing = await prisma.followUp.findFirst({
      where: {
        id,
        organizationId: session.organization.id,
        deletedAt: null,
      },
    });
    if (!existing) return { ok: false, error: "Follow-up not found" };

    await prisma.followUp.update({
      where: { id },
      data: {
        leadId: parsed.data.leadId,
        title: parsed.data.title,
        notes: parsed.data.notes || null,
        dueAt,
        assigneeId: parsed.data.assigneeId || existing.assigneeId,
        remindedAt: null,
      },
    });

    await prisma.lead.update({
      where: { id: parsed.data.leadId },
      data: { nextFollowUpAt: dueAt },
    });

    revalidatePath("/follow-ups");
    revalidatePath("/dashboard");
    return { ok: true };
  } catch (error) {
    console.error(error);
    return { ok: false, error: "Failed to update follow-up" };
  }
}

export async function setFollowUpStatusAction(
  input: unknown
): Promise<ActionResult> {
  try {
    const session = await requireRole([
      MembershipRole.OWNER,
      MembershipRole.ADMIN,
      MembershipRole.SALES,
    ]);
    const parsed = followUpStatusSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: "Invalid status update" };

    const existing = await prisma.followUp.findFirst({
      where: {
        id: parsed.data.id,
        organizationId: session.organization.id,
        deletedAt: null,
      },
    });
    if (!existing) return { ok: false, error: "Follow-up not found" };

    await prisma.followUp.update({
      where: { id: existing.id },
      data: {
        status: parsed.data.status,
        completedAt:
          parsed.data.status === FollowUpStatus.DONE ? new Date() : null,
      },
    });

    if (parsed.data.status === FollowUpStatus.DONE) {
      await prisma.activity.create({
        data: {
          organizationId: session.organization.id,
          leadId: existing.leadId,
          actorId: session.user.id,
          type: "TASK",
          title: `Follow-up completed: ${existing.title}`,
        },
      });
    }

    revalidatePath("/follow-ups");
    revalidatePath("/dashboard");
    return { ok: true };
  } catch (error) {
    console.error(error);
    return { ok: false, error: "Failed to update status" };
  }
}

export async function deleteFollowUpAction(id: string): Promise<ActionResult> {
  try {
    const session = await requireRole([
      MembershipRole.OWNER,
      MembershipRole.ADMIN,
      MembershipRole.SALES,
    ]);

    await prisma.followUp.updateMany({
      where: {
        id,
        organizationId: session.organization.id,
        deletedAt: null,
      },
      data: { deletedAt: new Date(), status: FollowUpStatus.CANCELLED },
    });

    revalidatePath("/follow-ups");
    revalidatePath("/dashboard");
    return { ok: true };
  } catch (error) {
    console.error(error);
    return { ok: false, error: "Failed to delete follow-up" };
  }
}

export async function fetchAndMarkRemindersAction(): Promise<
  ActionResult<{
    overdue: number;
    today: number;
    items: {
      id: string;
      title: string;
      dueAt: string;
      bucket: string;
      leadLabel: string;
    }[];
  }>
> {
  try {
    const session = await requireAuth();
    const items = await getReminderCandidates(
      session.organization.id,
      session.user.id
    );

    if (items.length) {
      await prisma.followUp.updateMany({
        where: {
          id: { in: items.map((item) => item.id) },
          organizationId: session.organization.id,
        },
        data: { remindedAt: new Date() },
      });
    }

    return {
      ok: true,
      data: {
        overdue: items.filter((item) => item.bucket === "overdue").length,
        today: items.filter((item) => item.bucket === "today").length,
        items,
      },
    };
  } catch (error) {
    console.error(error);
    return { ok: false, error: "Reminder check failed" };
  }
}
