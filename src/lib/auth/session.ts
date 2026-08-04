import { MembershipRole, MembershipStatus } from "@prisma/client";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { ensureUserBootstrap } from "@/lib/auth/bootstrap";

export type SessionContext = {
  user: {
    id: string;
    email: string;
    fullName: string | null;
    avatarUrl: string | null;
  };
  organization: {
    id: string;
    name: string;
    slug: string;
  };
  membership: {
    id: string;
    role: MembershipRole;
    status: MembershipStatus;
  };
};

export async function getSessionUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function requireAuth(): Promise<SessionContext> {
  const authUser = await getSessionUser();
  if (!authUser?.email) {
    redirect("/login");
  }

  const context = await ensureUserBootstrap({
    id: authUser.id,
    email: authUser.email,
    fullName:
      (authUser.user_metadata?.full_name as string | undefined) ??
      (authUser.user_metadata?.name as string | undefined) ??
      null,
    avatarUrl:
      (authUser.user_metadata?.avatar_url as string | undefined) ??
      (authUser.user_metadata?.picture as string | undefined) ??
      null,
    inviteToken:
      (authUser.user_metadata?.invite_token as string | undefined) ?? null,
  });

  return context;
}

export async function requireRole(
  roles: MembershipRole[]
): Promise<SessionContext> {
  const session = await requireAuth();
  if (!roles.includes(session.membership.role)) {
    redirect("/dashboard");
  }
  return session;
}

export async function getMembershipForUser(userId: string) {
  return prisma.membership.findFirst({
    where: {
      userId,
      deletedAt: null,
      status: MembershipStatus.ACTIVE,
    },
    include: {
      organization: true,
      user: true,
    },
    orderBy: { createdAt: "asc" },
  });
}
