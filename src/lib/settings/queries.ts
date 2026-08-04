import {
  InvitationStatus,
  MembershipStatus,
  Prisma,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  parsePreferences,
  type OrgPreferences,
} from "@/lib/settings/schema";

export type SettingsOrganization = {
  id: string;
  name: string;
  slug: string;
  website: string | null;
  phone: string | null;
  address: string | null;
  preferences: OrgPreferences;
};

export type SettingsMember = {
  id: string;
  role: string;
  status: string;
  createdAt: string;
  user: {
    id: string;
    email: string;
    fullName: string | null;
  };
};

export type SettingsInvitation = {
  id: string;
  email: string;
  role: string;
  status: string;
  token: string;
  expiresAt: string;
  createdAt: string;
  invitedBy: {
    fullName: string | null;
    email: string;
  } | null;
};

export type SettingsProfile = {
  id: string;
  email: string;
  fullName: string | null;
};

export async function getSettingsOrganization(organizationId: string) {
  const org = await prisma.organization.findFirst({
    where: { id: organizationId, deletedAt: null },
  });
  if (!org) return null;

  return {
    id: org.id,
    name: org.name,
    slug: org.slug,
    website: org.website,
    phone: org.phone,
    address: org.address,
    preferences: parsePreferences(org.settings),
  } satisfies SettingsOrganization;
}

export async function listOrganizationMembers(organizationId: string) {
  const rows = await prisma.membership.findMany({
    where: {
      organizationId,
      deletedAt: null,
      status: MembershipStatus.ACTIVE,
    },
    include: {
      user: { select: { id: true, email: true, fullName: true } },
    },
    orderBy: [{ role: "asc" }, { createdAt: "asc" }],
  });

  return rows.map(
    (row): SettingsMember => ({
      id: row.id,
      role: row.role,
      status: row.status,
      createdAt: row.createdAt.toISOString(),
      user: row.user,
    })
  );
}

export async function listOrganizationInvitations(organizationId: string) {
  const rows = await prisma.invitation.findMany({
    where: {
      organizationId,
      deletedAt: null,
      status: { in: [InvitationStatus.PENDING, InvitationStatus.EXPIRED] },
    },
    include: {
      invitedBy: { select: { fullName: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return rows.map(
    (row): SettingsInvitation => ({
      id: row.id,
      email: row.email,
      role: row.role,
      status: row.status,
      token: row.token,
      expiresAt: row.expiresAt.toISOString(),
      createdAt: row.createdAt.toISOString(),
      invitedBy: row.invitedBy,
    })
  );
}

export async function getInvitePreview(token: string) {
  const invite = await prisma.invitation.findFirst({
    where: {
      token,
      status: InvitationStatus.PENDING,
      deletedAt: null,
      expiresAt: { gt: new Date() },
    },
    include: {
      organization: { select: { name: true } },
    },
  });

  if (!invite) return null;

  return {
    email: invite.email,
    role: invite.role,
    organizationName: invite.organization.name,
    expiresAt: invite.expiresAt.toISOString(),
  };
}

export type OrganizationSettingsJson = Prisma.JsonValue;
