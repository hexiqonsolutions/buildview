"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { OpsSidebar } from "@/components/admin/layout/ops-sidebar";
import { OpsCommandHeader } from "@/components/admin/layout/ops-command-header";

import { AdminWorkspaceProvider } from "@/components/admin/workspace/admin-workspace-provider";
import { PortalErrorBoundary } from "@/components/dashboard/portal-error-boundary";
import { PortalTheme } from "@/components/integrations/portal-theme";
import type { AdminWorkspaceBootstrap } from "@/lib/admin/workspace";
import type { User } from "@/lib/types";

interface AdminShellProps {
  user: User;
  workspaceBootstrap: AdminWorkspaceBootstrap;
  unreadNotifications?: number;
  children: React.ReactNode;
}

export function AdminShell({ user, workspaceBootstrap, unreadNotifications = 0, children }: AdminShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  return (
    <PortalErrorBoundary>
      <AdminWorkspaceProvider bootstrap={workspaceBootstrap}>
        <div className="ops-shell">
          <PortalTheme />
          <OpsSidebar userRole={user.role} mobileOpen={mobileOpen} onMobileClose={() => setMobileOpen(false)} />
          <div className="ops-main">
            <div className="ops-header-stack sticky top-0 z-30">
              <OpsCommandHeader
                user={user}
                menuOpen={mobileOpen}
                onMenuClick={() => setMobileOpen((open) => !open)}
                unreadNotifications={unreadNotifications}
              />
            </div>
            <main className="ops-content">{children}</main>
          </div>
        </div>
      </AdminWorkspaceProvider>
    </PortalErrorBoundary>
  );
}
