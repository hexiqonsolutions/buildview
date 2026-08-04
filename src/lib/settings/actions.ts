"use server";

import { revalidatePath } from "next/cache";
import {
  InvitationStatus,
  MembershipRole,
  MembershipStatus,
} from "@prisma/client";
import { addDays } from "date-fns";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireRole } from "@/lib/auth/session";
import {
  inviteFormSchema,
  membershipRoleSchema,
  organizationFormSchema,
  preferencesFormSchema,
  profileFormSchema,
} from "@/lib/settings/schema";

type ActionResult<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

function revalidateSettings() {
  revalidatePath("/settings");
  revalidatePath("/dashboard");
}

export async function updateOrganizationAction(
  input: unknown
): Promise<ActionResult> {
  try {
    const session = await requireRole([
      MembershipRole.OWNER,
      MembershipRole.ADMIN,
    ]);
    const parsed = organizationFormSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues[0]?.message ?? "Invalid organization",
      };
    }

    await prisma.organization.update({
      where: { id: session.organization.id },
      data: {
        name: parsed.data.name,
        website: parsed.data.website || null,
        phone: parsed.data.phone || null,
        address: parsed.data.address || null,
      },
    });

    await prisma.auditLog.create({
      data: {
        organizationId: session.organization.id,
        actorId: session.user.id,
        action: "organization.updated",
        entityType: "organization",
        entityId: session.organization.id,
      },
    });

    revalidateSettings();
    return { ok: true };
  } catch (error) {
    console.error("updateOrganizationAction:", error);
    return { ok: false, error: "Could not update organization" };
  }
}

export async function updatePreferencesAction(
  input: unknown
): Promise<ActionResult> {
  try {
    const session = await requireRole([
      MembershipRole.OWNER,
      MembershipRole.ADMIN,
    ]);
    const parsed = preferencesFormSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues[0]?.message ?? "Invalid preferences",
      };
    }

    await prisma.organization.update({
      where: { id: session.organization.id },
      data: { settings: parsed.data },
    });

    await prisma.auditLog.create({
      data: {
        organizationId: session.organization.id,
        actorId: session.user.id,
        action: "organization.preferences_updated",
        entityType: "organization",
        entityId: session.organization.id,
      },
    });

    revalidateSettings();
    return { ok: true };
  } catch (error) {
    console.error("updatePreferencesAction:", error);
    return { ok: false, error: "Could not update preferences" };
  }
}

export async function updateProfileAction(
  input: unknown
): Promise<ActionResult> {
  try {
    const session = await requireAuth();
    const parsed = profileFormSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues[0]?.message ?? "Invalid profile",
      };
    }

    await prisma.user.update({
      where: { id: session.user.id },
      data: { fullName: parsed.data.fullName },
    });

    revalidateSettings();
    return { ok: true };
  } catch (error) {
    console.error("updateProfileAction:", error);
    return { ok: false, error: "Could not update profile" };
  }
}

export async function createInvitationAction(
  input: unknown
): Promise<ActionResult<{ token: string }>> {
  try {
    const session = await requireRole([
      MembershipRole.OWNER,
      MembershipRole.ADMIN,
    ]);
    const parsed = inviteFormSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues[0]?.message ?? "Invalid invitation",
      };
    }

    const email = parsed.data.email.toLowerCase();

    const existingMember = await prisma.membership.findFirst({
      where: {
        organizationId: session.organization.id,
        deletedAt: null,
        status: MembershipStatus.ACTIVE,
        user: { email: { equals: email, mode: "insensitive" } },
      },
    });
    if (existingMember) {
      return { ok: false, error: "That user is already on the team" };
    }

    const pending = await prisma.invitation.findFirst({
      where: {
        organizationId: session.organization.id,
        email: { equals: email, mode: "insensitive" },
        status: InvitationStatus.PENDING,
        deletedAt: null,
        expiresAt: { gt: new Date() },
      },
    });
    if (pending) {
      return { ok: false, error: "An invitation is already pending for that email" };
    }

    const invitation = await prisma.invitation.create({
      data: {
        organizationId: session.organization.id,
        email,
        role: parsed.data.role as MembershipRole,
        invitedById: session.user.id,
        expiresAt: addDays(new Date(), 14),
        status: InvitationStatus.PENDING,
      },
    });

    await prisma.auditLog.create({
      data: {
        organizationId: session.organization.id,
        actorId: session.user.id,
        action: "invitation.created",
        entityType: "invitation",
        entityId: invitation.id,
        metadata: { email, role: invitation.role },
      },
    });

    revalidateSettings();
    return { ok: true, data: { token: invitation.token } };
  } catch (error) {
    console.error("createInvitationAction:", error);
    return { ok: false, error: "Could not create invitation" };
  }
}

export async function revokeInvitationAction(
  invitationId: string
): Promise<ActionResult> {
  try {
    const session = await requireRole([
      MembershipRole.OWNER,
      MembershipRole.ADMIN,
    ]);

    const invite = await prisma.invitation.findFirst({
      where: {
        id: invitationId,
        organizationId: session.organization.id,
        deletedAt: null,
      },
    });
    if (!invite) return { ok: false, error: "Invitation not found" };

    await prisma.invitation.update({
      where: { id: invite.id },
      data: { status: InvitationStatus.REVOKED },
    });

    revalidateSettings();
    return { ok: true };
  } catch (error) {
    console.error("revokeInvitationAction:", error);
    return { ok: false, error: "Could not revoke invitation" };
  }
}

export async function updateMemberRoleAction(
  membershipId: string,
  input: unknown
): Promise<ActionResult> {
  try {
    const session = await requireRole([
      MembershipRole.OWNER,
      MembershipRole.ADMIN,
    ]);
    const parsed = membershipRoleSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: "Invalid role" };
    }

    const member = await prisma.membership.findFirst({
      where: {
        id: membershipId,
        organizationId: session.organization.id,
        deletedAt: null,
      },
    });
    if (!member) return { ok: false, error: "Member not found" };

    if (member.userId === session.user.id) {
      return { ok: false, error: "You cannot change your own role" };
    }

    if (member.role === MembershipRole.OWNER) {
      return { ok: false, error: "Owner role cannot be changed here" };
    }

    if (
      parsed.data.role === MembershipRole.OWNER &&
      session.membership.role !== MembershipRole.OWNER
    ) {
      return { ok: false, error: "Only the owner can assign Owner" };
    }

    if (
      session.membership.role === MembershipRole.ADMIN &&
      (parsed.data.role === MembershipRole.OWNER ||
        parsed.data.role === MembershipRole.ADMIN)
    ) {
      return { ok: false, error: "Admins can assign Sales or Viewer only" };
    }

    await prisma.membership.update({
      where: { id: member.id },
      data: { role: parsed.data.role },
    });

    await prisma.auditLog.create({
      data: {
        organizationId: session.organization.id,
        actorId: session.user.id,
        action: "membership.role_updated",
        entityType: "membership",
        entityId: member.id,
        metadata: { role: parsed.data.role },
      },
    });

    revalidateSettings();
    return { ok: true };
  } catch (error) {
    console.error("updateMemberRoleAction:", error);
    return { ok: false, error: "Could not update member role" };
  }
}

export async function removeMemberAction(
  membershipId: string
): Promise<ActionResult> {
  try {
    const session = await requireRole([
      MembershipRole.OWNER,
      MembershipRole.ADMIN,
    ]);

    const member = await prisma.membership.findFirst({
      where: {
        id: membershipId,
        organizationId: session.organization.id,
        deletedAt: null,
      },
    });
    if (!member) return { ok: false, error: "Member not found" };

    if (member.userId === session.user.id) {
      return { ok: false, error: "You cannot remove yourself" };
    }

    if (member.role === MembershipRole.OWNER) {
      return { ok: false, error: "Cannot remove the owner" };
    }

    if (
      session.membership.role === MembershipRole.ADMIN &&
      member.role === MembershipRole.ADMIN
    ) {
      return { ok: false, error: "Admins cannot remove other admins" };
    }

    await prisma.membership.update({
      where: { id: member.id },
      data: {
        deletedAt: new Date(),
        status: MembershipStatus.SUSPENDED,
      },
    });

    await prisma.auditLog.create({
      data: {
        organizationId: session.organization.id,
        actorId: session.user.id,
        action: "membership.removed",
        entityType: "membership",
        entityId: member.id,
      },
    });

    revalidateSettings();
    return { ok: true };
  } catch (error) {
    console.error("removeMemberAction:", error);
    return { ok: false, error: "Could not remove member" };
  }
}
