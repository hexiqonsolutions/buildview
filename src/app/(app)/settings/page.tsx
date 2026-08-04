import { Suspense } from "react";
import { MembershipRole } from "@prisma/client";
import { requireAuth } from "@/lib/auth/session";
import {
  getSettingsOrganization,
  listOrganizationInvitations,
  listOrganizationMembers,
} from "@/lib/settings/queries";
import {
  isSettingsSection,
  type SettingsSection,
} from "@/lib/settings/schema";
import { AppTopbar } from "@/components/layout/app-topbar";
import { SettingsWorkspace } from "@/components/settings/settings-workspace";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function SettingsPage({ searchParams }: PageProps) {
  const session = await requireAuth();
  const params = await searchParams;
  const sectionParam = first(params.section);
  const section: SettingsSection = isSettingsSection(sectionParam)
    ? sectionParam
    : "organization";

  const [organization, members, invitations] = await Promise.all([
    getSettingsOrganization(session.organization.id),
    listOrganizationMembers(session.organization.id),
    listOrganizationInvitations(session.organization.id),
  ]);

  if (!organization) {
    return (
      <div>
        <AppTopbar title="Settings" description="Workspace unavailable" />
        <p className="p-7 text-sm text-zinc-500">Organization not found.</p>
      </div>
    );
  }

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    "http://localhost:3000";

  return (
    <div>
      <AppTopbar
        title="Settings"
        description={`${organization.name} · ${session.membership.role.toLowerCase()}`}
      />
      <Suspense
        fallback={
          <div className="p-7 text-sm text-zinc-500">Loading settings…</div>
        }
      >
        <SettingsWorkspace
          section={section}
          role={session.membership.role as MembershipRole}
          organization={organization}
          members={members}
          invitations={invitations}
          profile={{
            id: session.user.id,
            email: session.user.email,
            fullName: session.user.fullName,
          }}
          appUrl={appUrl}
        />
      </Suspense>
    </div>
  );
}
