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
      <div className="flex min-h-[72px] items-start justify-between border-b border-slate-200/50 px-5 pb-4 pt-5 dark:border-slate-800/60">
        <div className="min-w-0">
          <BrandLogo href={homeHref} size="md" className="max-w-[9rem]" />
          <p className="mt-1.5 text-[10px] font-medium uppercase tracking-[0.2em] text-slate-400">
            {getPortalSidebarTagline(dashboardType)}
          </p>
        </div>
        {onMobileClose && (
          <button
            type="button"
            onClick={onMobileClose}
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 lg:hidden"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-5" aria-label="Client portal">
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
      <aside className="intel-sidebar hidden lg:flex">{content}</aside>
      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 z-[60] bg-black/40 lg:hidden"
            onClick={onMobileClose}
            aria-hidden
          />
          <aside className="intel-sidebar !fixed inset-y-0 left-0 z-[70] flex w-72 max-w-[85vw] flex-col bg-white dark:bg-slate-950 lg:hidden">
            {content}
          </aside>
        </>
      )}
    </>
  );
}
