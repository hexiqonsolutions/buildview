"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { IntelSidebar } from "@/components/intel/shell/intel-sidebar";
import { IntelHeader } from "@/components/intel/shell/intel-header";

import { IntelContextBar } from "@/components/intel/shell/intel-context-bar";
import { IntelWorkspaceBar } from "@/components/intel/shell/intel-workspace-bar";
import { ImpersonationBanner } from "@/components/intel/shell/impersonation-banner";
import { IntelProjectProvider } from "@/components/intel/shell/intel-project-context";
import { PortalErrorBoundary } from "@/components/dashboard/portal-error-boundary";
import { PortalTheme } from "@/components/integrations/portal-theme";
import { pageVariants } from "@/design-system/motion";
import type { User } from "@/lib/types";

interface IntelShellProps {
  user: User;
  unreadNotifications?: number;
  children: React.ReactNode;
}

/**
 * Client Intelligence Platform shell — distinct from OpsShell.
 * Minimal, executive, monitoring-focused layout.
 */
export function IntelShell({ user, unreadNotifications = 0, children }: IntelShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <PortalErrorBoundary>
      <IntelProjectProvider>
        <div className="intel-shell">
          <PortalTheme />
          <IntelSidebar mobileOpen={mobileOpen} onMobileClose={() => setMobileOpen(false)} />
          <div className="intel-main">
            <div className="intel-header-stack">
              <ImpersonationBanner />
              <IntelHeader user={user} unreadNotifications={unreadNotifications} onMenuClick={() => setMobileOpen(true)} />
              <IntelWorkspaceBar />
              <IntelContextBar />
            </div>
            <main className="intel-content">
              <AnimatePresence mode="wait">
                <motion.div
                  key="intel-page"
                  initial="hidden"
                  animate="visible"
                  variants={pageVariants}
                >
                  {children}
                </motion.div>
              </AnimatePresence>
            </main>
          </div>
        </div>
      </IntelProjectProvider>
    </PortalErrorBoundary>
  );
}
