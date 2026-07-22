import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/actions/auth";
import { getUnreadNotificationCount } from "@/lib/actions/notifications";
import { getPortalWorkspaceBootstrap } from "@/lib/actions/data";
import { PortalLayout } from "@/components/dashboard/portal-layout";
import { ensureUserProfile } from "@/lib/supabase/provision-user";
import { getAuthUser } from "@/lib/supabase/server";
import type { User } from "@/lib/types";

function toPortalUser(user: NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>): User {
  const email = user.email?.trim() || "user@buildview.local";
  const fullName = user.full_name?.trim() || email.split("@")[0] || "User";

  return {
    id: user.id,
    email,
    full_name: fullName,
    role: user.role,
    client_id: user.client_id,
    avatar_url: user.avatar_url,
    phone: user.phone,
    is_active: user.is_active,
    dashboard_type: user.dashboard_type ?? null,
    created_by: user.created_by,
    updated_by: user.updated_by,
    deleted_by: user.deleted_by,
    created_at: user.created_at,
    updated_at: user.updated_at,
    deleted_at: user.deleted_at,
  };
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let user = await getCurrentUser();

  if (!user) {
    const authUser = await getAuthUser();
    if (authUser) {
      await ensureUserProfile(authUser);
      user = await getCurrentUser();
    }
  }

  if (!user) {
    redirect("/login?error=profile_setup_failed&redirect=/dashboard");
  }

  if (!user.is_active || user.deleted_at) {
    redirect("/login?error=account_inactive");
  }

  const [unreadNotifications, workspaceBootstrap] = await Promise.all([
    getUnreadNotificationCount(),
    getPortalWorkspaceBootstrap(),
  ]);

  return (
    <PortalLayout
      user={toPortalUser(user)}
      unreadNotifications={unreadNotifications}
      workspaceBootstrap={workspaceBootstrap}
    >
      {children}
    </PortalLayout>
  );
}
