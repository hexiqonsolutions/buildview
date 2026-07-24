"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  FolderKanban,
  Upload,
  Camera,
  Calendar,
  FileText,
  FolderOpen,
  ImageIcon,
  AlertTriangle,
  Receipt,
  HardDrive,
  Bell,
  Activity,
  Settings,
  X,
  ExternalLink,
  BarChart3,
  UserCog,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { BrandLogo } from "@/components/brand/brand-logo";
import {
  useAdminWorkspaceHref,
  useAdminWorkspaceQuery,
} from "@/components/admin/workspace/use-admin-workspace-href";
import { withAdminWorkspaceQuery } from "@/lib/admin/nav";
import { useAdminWorkspace } from "@/components/admin/workspace/admin-workspace-provider";
import { filterNavByRole } from "@/lib/auth/nav-permissions";
import type { PermissionResource } from "@/lib/auth/permissions";
import type { UserRole } from "@/lib/types";

const navSections: Array<{
  label: string;
  items: Array<{
    href: string;
    label: string;
    icon: typeof LayoutDashboard;
    exact?: boolean;
    resource: PermissionResource;
  }>;
}> = [
  {
    label: "Operations",
    items: [
      { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true, resource: "projects" },
      { href: "/admin/clients", label: "Client Manager", icon: Users, resource: "clients" },
      { href: "/admin/projects", label: "Project Manager", icon: FolderKanban, resource: "projects" },
      { href: "/admin/upload", label: "Upload Center", icon: Upload, resource: "upload" },
    ],
  },
  {
    label: "Content",
    items: [
      { href: "/admin/tours", label: "Matterport Manager", icon: Camera, resource: "matterport" },
      { href: "/admin/timeline", label: "Timeline Manager", icon: Calendar, resource: "reports" },
      { href: "/admin/reports", label: "Reports Manager", icon: FileText, resource: "reports" },
      { href: "/admin/documents", label: "Documents", icon: FolderOpen, resource: "documents" },
      { href: "/admin/photos", label: "Site Photos", icon: ImageIcon, resource: "documents" },
      { href: "/admin/issues", label: "Issues", icon: AlertTriangle, resource: "issues" },
      { href: "/admin/invoices", label: "Invoices", icon: Receipt, resource: "invoices" },
    ],
  },
  {
    label: "System",
    items: [
      { href: "/admin/users", label: "User Manager", icon: UserCog, resource: "users" },
      { href: "/admin/analytics", label: "Analytics", icon: BarChart3, resource: "analytics" },
      { href: "/admin/storage", label: "Storage Manager", icon: HardDrive, resource: "storage" },
      { href: "/admin/notifications", label: "Notifications", icon: Bell, resource: "notifications" },
      { href: "/admin/activity", label: "Activity Logs", icon: Activity, resource: "activity" },
      { href: "/admin/settings", label: "Settings", icon: Settings, resource: "settings" },
    ],
  },
];

function isActive(pathname: string, href: string, exact?: boolean) {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

interface OpsSidebarProps {
  userRole: UserRole;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export function OpsSidebar({ userRole, mobileOpen, onMobileClose }: OpsSidebarProps) {
  const pathname = usePathname();
  const { client, project, hydrated } = useAdminWorkspace();
  const workspaceQuery = useAdminWorkspaceQuery();
  const homeHref = useAdminWorkspaceHref("/admin");

  const content = (
    <>
      <div className="flex min-h-[68px] items-start justify-between border-b border-slate-200/80 px-4 pb-2.5 pt-3 dark:border-slate-800">
        <div className="min-w-0">
          <BrandLogo href={homeHref} size="md" className="mt-1 max-w-[10rem]" />
          <p className="mt-0.5 text-[10px] font-medium uppercase tracking-widest text-slate-400">
            Control Center
          </p>
        </div>
        {onMobileClose && (
          <button
            type="button"
            onClick={onMobileClose}
            className="mt-1 rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 lg:hidden"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {hydrated && client && (
        <div className="border-b border-slate-200/80 px-4 py-3 dark:border-slate-800">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Active Workspace
          </p>
          <p className="mt-1 truncate text-sm font-semibold text-slate-900 dark:text-white">
            {client.company_name || client.name}
          </p>
          {project && (
            <p className="truncate text-xs text-slate-500">{project.name}</p>
          )}
        </div>
      )}

      <nav className="flex-1 space-y-4 overflow-y-auto px-3 py-4">
        {navSections.map((section) => {
          const items = filterNavByRole(section.items, userRole);
          if (items.length === 0) return null;
          return (
          <div key={section.label}>
            <p className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              {section.label}
            </p>
            <div className="space-y-0.5">
              {items.map((item) => {
                const active = isActive(
                  pathname,
                  item.href,
                  "exact" in item ? item.exact : undefined
                );
                const href = withAdminWorkspaceQuery(item.href, workspaceQuery);
                return (
                  <Link
                    key={item.href}
                    href={href}
                    onClick={onMobileClose}
                    className={cn("ops-nav-item", active && "ops-nav-item-active")}
                  >
                    <item.icon className="h-[17px] w-[17px] shrink-0" strokeWidth={1.75} />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
          );
        })}
      </nav>

      <div className="border-t border-slate-200/80 p-3 dark:border-slate-800">
        <Link
          href="/dashboard"
          onClick={onMobileClose}
          className="ops-nav-item text-xs text-slate-500"
        >
          <ExternalLink className="h-4 w-4" />
          Client Portal Preview
        </Link>
      </div>
    </>
  );

  return (
    <>
      <aside className="ops-sidebar hidden lg:flex">{content}</aside>
      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 z-[60] bg-black/40 lg:hidden"
            onClick={onMobileClose}
            aria-hidden
          />
          <aside className="ops-sidebar !fixed inset-y-0 left-0 z-[70] flex w-72 max-w-[85vw] flex-col bg-white dark:bg-slate-950 lg:hidden">
            {content}
          </aside>
        </>
      )}
    </>
  );
}
