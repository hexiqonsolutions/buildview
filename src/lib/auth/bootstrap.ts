import { randomBytes } from "crypto";
import {
  MembershipRole,
  MembershipStatus,
  Prisma,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/utils";
import type { SessionContext } from "@/lib/auth/session";

type BootstrapInput = {
  id: string;
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
  inviteToken?: string | null;
};

function orgNameFromEmail(email: string): string {
  const local = email.split("@")[0] ?? "team";
  const cleaned = local.replace(/[._-]+/g, " ").trim();
  const titled = cleaned
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
  return titled ? `${titled}'s Workspace` : "BuildView Workspace";
}

/** Slug must be unique across ALL orgs (including soft-deleted). */
async function uniqueSlug(base: string, userId: string): Promise<string> {
  const root = slugify(base) || "workspace";
  const suffix = userId.replace(/-/g, "").slice(0, 8);
  let candidate = `${root}-${suffix}`;
  let attempt = 0;

  while (
    await prisma.organization.findFirst({
      where: { slug: candidate },
      select: { id: true },
    })
  ) {
    attempt += 1;
    candidate = `${root}-${suffix}-${attempt}-${randomBytes(2).toString("hex")}`;
  }

  return candidate;
}

async function createOwnerWorkspace(userId: string, email: string) {
  const name = orgNameFromEmail(email);

  for (let tryCount = 0; tryCount < 5; tryCount += 1) {
    const slug = await uniqueSlug(name, userId);
    try {
      return await prisma.$transaction(async (tx) => {
        const organization = await tx.organization.create({
          data: {
            name,
            slug,
            branding: {
              primaryColor: "#F97316",
              theme: "dark",
            },
          },
        });

        const created = await tx.membership.create({
          data: {
            organizationId: organization.id,
            userId,
            role: MembershipRole.OWNER,
            status: MembershipStatus.ACTIVE,
          },
          include: { organization: true },
        });

        await tx.auditLog.create({
          data: {
            organizationId: organization.id,
            actorId: userId,
            action: "organization.created",
            entityType: "organization",
            entityId: organization.id,
            metadata: { via: "auth_bootstrap" },
          },
        });

        return created;
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        continue;
      }
      throw error;
    }
  }

  throw new Error("Could not create a unique workspace. Please try again.");
}

export async function ensureUserBootstrap(
  input: BootstrapInput
): Promise<SessionContext> {
  const user = await prisma.user.upsert({
    where: { id: input.id },
    update: {
      email: input.email,
      fullName: input.fullName,
      avatarUrl: input.avatarUrl,
      deletedAt: null,
    },
    create: {
      id: input.id,
      email: input.email,
      fullName: input.fullName,
      avatarUrl: input.avatarUrl,
    },
  });

  let membership = await prisma.membership.findFirst({
    where: {
      userId: user.id,
      deletedAt: null,
      status: MembershipStatus.ACTIVE,
    },
    include: { organization: true },
    orderBy: { createdAt: "asc" },
  });

  // Revive a soft-deleted / suspended membership instead of creating a second org.
  if (!membership) {
    const inactive = await prisma.membership.findFirst({
      where: { userId: user.id },
      include: { organization: true },
      orderBy: { createdAt: "asc" },
    });
    if (inactive) {
      membership = await prisma.membership.update({
        where: { id: inactive.id },
        data: {
          deletedAt: null,
          status: MembershipStatus.ACTIVE,
        },
        include: { organization: true },
      });
    }
  }

  if (!membership) {
    const pendingInvite = input.inviteToken
      ? await prisma.invitation.findFirst({
          where: {
            token: input.inviteToken,
            status: "PENDING",
            deletedAt: null,
            expiresAt: { gt: new Date() },
            email: { equals: input.email, mode: "insensitive" },
          },
          orderBy: { createdAt: "desc" },
        })
      : await prisma.invitation.findFirst({
          where: {
            email: { equals: input.email, mode: "insensitive" },
            status: "PENDING",
            deletedAt: null,
            expiresAt: { gt: new Date() },
          },
          orderBy: { createdAt: "desc" },
        });

    if (pendingInvite) {
      membership = await prisma.$transaction(async (tx) => {
        const existing = await tx.membership.findFirst({
          where: {
            organizationId: pendingInvite.organizationId,
            userId: user.id,
          },
          include: { organization: true },
        });

        const created = existing
          ? await tx.membership.update({
              where: { id: existing.id },
              data: {
                deletedAt: null,
                status: MembershipStatus.ACTIVE,
                role: pendingInvite.role,
              },
              include: { organization: true },
            })
          : await tx.membership.create({
              data: {
                organizationId: pendingInvite.organizationId,
                userId: user.id,
                role: pendingInvite.role,
                status: MembershipStatus.ACTIVE,
              },
              include: { organization: true },
            });

        await tx.invitation.update({
          where: { id: pendingInvite.id },
          data: { status: "ACCEPTED" },
        });

        await tx.auditLog.create({
          data: {
            organizationId: pendingInvite.organizationId,
            actorId: user.id,
            action: "membership.accepted_invite",
            entityType: "membership",
            entityId: created.id,
            metadata: { invitationId: pendingInvite.id },
          },
        });

        return created;
      });
    } else {
      membership = await createOwnerWorkspace(user.id, input.email);
    }
  }

  return {
    user: {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      avatarUrl: user.avatarUrl,
    },
    organization: {
      id: membership.organization.id,
      name: membership.organization.name,
      slug: membership.organization.slug,
    },
    membership: {
      id: membership.id,
      role: membership.role,
      status: membership.status,
    },
  };
}
