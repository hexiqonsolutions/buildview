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
  ReceiptIndianRupee,
  HardDrive,
  Activity,
  Settings,
  BarChart3,
  UserCog,
  ContactRound,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAdminWorkspace } from "@/components/admin/workspace/admin-workspace-provider";
import { filterNavByRole } from "@/lib/auth/nav-permissions";
import type { PermissionResource } from "@/lib/auth/permissions";
import type { UserRole } from "@/lib/types";
import { MobileNavDrawer } from "@/components/layout/mobile-nav-drawer";
import { SidebarBrandHeader } from "@/components/layout/sidebar-brand-header";
import {
  PortalLensSwitcher,
  useAdminPortalLens,
} from "@/components/admin/workspace/admin-portal-lens";
import type { ClientDashboardType } from "@/lib/portal/dashboard-type";

const navSections: Array<{
  label: string;
  items: Array<{
    href: string;
    label: string;
    icon: typeof LayoutDashboard;
    exact?: boolean;
    resource: PermissionResource;
    /** Portals this page applies to; omitted = every portal. */
    portals?: ClientDashboardType[];
    /** Per-portal label, e.g. Tour Viewers → Buyer leads for Real Estate. */
    lensLabel?: Partial<Record<ClientDashboardType, string>>;
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
      { href: "/admin/tours", label: "Tour Manager", icon: Camera, resource: "matterport" },
      { href: "/admin/timeline", label: "Timeline Manager", icon: Calendar, resource: "reports", portals: ["construction"] },
      { href: "/admin/reports", label: "Reports Manager", icon: FileText, resource: "reports", portals: ["construction"] },
      { href: "/admin/documents", label: "Documents", icon: FolderOpen, resource: "documents" },
      { href: "/admin/photos", label: "Site Photos", icon: ImageIcon, resource: "documents", portals: ["construction"] },
      { href: "/admin/issues", label: "Issues", icon: AlertTriangle, resource: "issues", portals: ["construction"] },
      { href: "/admin/invoices", label: "Invoices", icon: ReceiptIndianRupee, resource: "invoices", portals: ["construction"] },
    ],
  },
  {
    label: "System",
    items: [
      { href: "/admin/users", label: "User Manager", icon: UserCog, resource: "users" },
      {
        href: "/admin/tour-viewers",
        label: "Tour Viewers",
        icon: ContactRound,
        resource: "tour_viewers",
        lensLabel: { property: "Buyer leads" },
      },
      { href: "/admin/analytics", label: "Analytics", icon: BarChart3, resource: "analytics" },
      { href: "/admin/storage", label: "Storage Manager", icon: HardDrive, resource: "storage" },
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
  const { resetScope } = useAdminWorkspace();
  const { lens } = useAdminPortalLens();
  const homeHref = "/admin";

  const content = (
    <>
      <SidebarBrandHeader
        homeHref={homeHref}
        tagline="Control Center"
        onMobileClose={onMobileClose}
      />
      <PortalLensSwitcher />

      <nav className="flex-1 space-y-4 overflow-y-auto px-3 py-4">
        {navSections.map((section) => {
          const items = filterNavByRole(section.items, userRole).filter(
            (item) => lens === "all" || !item.portals || item.portals.includes(lens)
          );
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
                // Plain links: switching section clears any client/project filter.
                const href = item.href;
                const isDashboard = item.href === "/admin";
                return (
                  <Link
                    key={item.href}
                    href={href}
                    onClick={() => {
                      if (isDashboard) resetScope();
                      onMobileClose?.();
                    }}
                    className={cn("ops-nav-item", active && "ops-nav-item-active")}
                  >
                    <item.icon className="h-[17px] w-[17px] shrink-0" strokeWidth={1.75} />
                    {(lens !== "all" && item.lensLabel?.[lens]) || item.label}
                  </Link>
                );
              })}
            </div>
          </div>
          );
        })}
      </nav>
    </>
  );

  return (
    <>
      <aside className="ops-sidebar z-30 hidden lg:flex">{content}</aside>
      <MobileNavDrawer open={Boolean(mobileOpen)} onClose={() => onMobileClose?.()}>
        {content}
      </MobileNavDrawer>
    </>
  );
}
