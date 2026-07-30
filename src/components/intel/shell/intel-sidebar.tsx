"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  usePortalWorkspaceHref,
  usePortalWorkspaceQuery,
} from "@/components/portal/workspace/use-portal-workspace-href";
import { withPortalWorkspaceQuery } from "@/lib/portal/nav";
import {
  getPortalNavItems,
  getPortalSidebarFooter,
  getPortalSidebarTagline,
} from "@/lib/portal/dashboard-type";
import { usePortalWorkspace } from "@/components/portal/workspace/portal-workspace-provider";
import { cn } from "@/lib/utils";
import { MobileNavDrawer } from "@/components/layout/mobile-nav-drawer";
import { SidebarBrandHeader } from "@/components/layout/sidebar-brand-header";

function isActive(pathname: string, href: string, exact?: boolean) {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

interface IntelSidebarProps {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export function IntelSidebar({ mobileOpen, onMobileClose }: IntelSidebarProps) {
  const pathname = usePathname();
  const workspaceQuery = usePortalWorkspaceQuery();
  const homeHref = usePortalWorkspaceHref("/dashboard");
  const { dashboardType } = usePortalWorkspace();
  const navItems = getPortalNavItems(dashboardType);

  const content = (
    <>
      <SidebarBrandHeader
        homeHref={homeHref}
        tagline={getPortalSidebarTagline(dashboardType)}
        onMobileClose={onMobileClose}
      />

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-2.5 py-4" aria-label="Client portal">
        {navItems.map((item) => {
          const active = isActive(pathname, item.href, item.exact);
          const href = withPortalWorkspaceQuery(item.href, workspaceQuery);
          return (
            <Link
              key={item.href}
              href={href}
              onClick={onMobileClose}
              className={cn("intel-nav-item", active && "intel-nav-item-active")}
            >
              <item.icon className="h-[18px] w-[18px] shrink-0" strokeWidth={1.75} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-slate-200/50 p-4 dark:border-slate-800/60">
        <p className="text-center text-[10px] text-slate-400">
          {getPortalSidebarFooter(dashboardType)}
        </p>
      </div>
    </>
  );

  return (
    <>
      <aside className="intel-sidebar z-30 hidden lg:flex">{content}</aside>
      <MobileNavDrawer open={Boolean(mobileOpen)} onClose={() => onMobileClose?.()}>
        {content}
      </MobileNavDrawer>
    </>
  );
}
