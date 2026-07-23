"use client";

import { Suspense } from "react";
import { IntelShell } from "@/components/intel/shell/intel-shell";
import { PortalErrorBoundary } from "@/components/dashboard/portal-error-boundary";
import { PortalWorkspaceProvider } from "@/components/portal/workspace/portal-workspace-provider";
import type { PortalWorkspaceBootstrap } from "@/lib/portal/workspace";
import type { User } from "@/lib/types";

interface PortalLayoutProps {
  user: User;
  children: React.ReactNode;
  unreadNotifications?: number;
  workspaceBootstrap: PortalWorkspaceBootstrap;
}

/** Client portal layout — uses IntelShell (Construction Intelligence Platform). */
export function PortalLayout({
  user,
  children,
  unreadNotifications = 0,
  workspaceBootstrap,
}: PortalLayoutProps) {
  return (
    <PortalErrorBoundary>
      <Suspense fallback={null}>
        <PortalWorkspaceProvider bootstrap={workspaceBootstrap}>
          <IntelShell user={user} unreadNotifications={unreadNotifications}>
            {children}
          </IntelShell>
        </PortalWorkspaceProvider>
      </Suspense>
    </PortalErrorBoundary>
  );
}
