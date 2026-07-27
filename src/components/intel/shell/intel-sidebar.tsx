"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import { BrandLogo } from "@/components/brand/brand-logo";
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
      <div className="flex min-h-[64px] items-start justify-between border-b border-slate-200/40 px-4 pb-3 pt-4 dark:border-slate-800/50">
        <div className="min-w-0">
          <BrandLogo href={homeHref} size="md" className="max-w-[9rem]" />
          <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-brand-accent-dark/80 dark:text-brand-accent/90">
            {getPortalSidebarTagline(dashboardType)}
          </p>
        </div>
        {onMobileClose && (
          <button
            type="button"
            onClick={onMobileClose}
            className="cursor-pointer rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 lg:hidden"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

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
