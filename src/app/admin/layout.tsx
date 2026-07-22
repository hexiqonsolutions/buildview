import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getCurrentUser } from "@/lib/actions/auth";
import { getAdminWorkspaceBootstrap } from "@/lib/actions/data";
import { getUnreadNotificationCount } from "@/lib/actions/notifications";
import { AdminShell } from "@/components/admin/layout/admin-shell";
import { PageLoadingSkeleton } from "@/components/patterns/page-states";
import { canAccessAdmin } from "@/lib/auth/permissions";
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
    created_by: user.created_by,
    updated_by: user.updated_by,
    deleted_by: user.deleted_by,
    created_at: user.created_at,
    updated_at: user.updated_at,
    deleted_at: user.deleted_at,
  };
}

export default async function AdminLayout({
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
    redirect("/login?error=profile_setup_failed&redirect=/admin");
  }

  if (!user.is_active || user.deleted_at) {
    redirect("/login?error=account_inactive");
  }

  if (!canAccessAdmin(user.role)) {
    redirect("/dashboard?error=unauthorized");
  }

  const workspaceBootstrap = await getAdminWorkspaceBootstrap();
  const unreadNotifications = await getUnreadNotificationCount();

  return (
    <Suspense fallback={<PageLoadingSkeleton />}>
      <AdminShell
        user={toPortalUser(user)}
        workspaceBootstrap={workspaceBootstrap}
        unreadNotifications={unreadNotifications}
      >
        {children}
      </AdminShell>
    </Suspense>
  );
}
