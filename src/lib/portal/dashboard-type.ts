import type { Client, User } from "@/lib/types";
import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  FolderKanban,
  Columns2,
  Calendar,
  FileText,
  FolderOpen,
  AlertTriangle,
  Receipt,
  User,
  Bell,
} from "lucide-react";

export const CLIENT_DASHBOARD_TYPES = ["construction", "portfolio"] as const;
export type ClientDashboardType = (typeof CLIENT_DASHBOARD_TYPES)[number];

export const CLIENT_DASHBOARD_TYPE_LABELS: Record<ClientDashboardType, string> = {
  construction: "Construction monitoring",
  portfolio: "Portfolio showcase",
};

export const CLIENT_DASHBOARD_TYPE_DESCRIPTIONS: Record<ClientDashboardType, string> = {
  construction:
    "Progress KPIs, timeline, reports, issues, and site monitoring for active builds.",
  portfolio:
    "Showcase walkthroughs and completed work for architecture, interior design, and real estate.",
};

export type PortalNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
};

const CONSTRUCTION_NAV: PortalNavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/dashboard/projects", label: "Projects", icon: FolderKanban },
  { href: "/dashboard/matterport-comparison", label: "Compare Tours", icon: Columns2 },
  { href: "/dashboard/timeline", label: "Timeline", icon: Calendar },
  { href: "/dashboard/reports", label: "Reports", icon: FileText },
  { href: "/dashboard/documents", label: "Documents", icon: FolderOpen },
  { href: "/dashboard/issues", label: "Issues", icon: AlertTriangle },
  { href: "/dashboard/invoices", label: "Invoices", icon: Receipt },
  { href: "/dashboard/notifications", label: "Notifications", icon: Bell },
  { href: "/dashboard/profile", label: "Profile", icon: User },
];

const PORTFOLIO_NAV: PortalNavItem[] = [
  { href: "/dashboard", label: "Portfolio", icon: LayoutDashboard, exact: true },
  { href: "/dashboard/projects", label: "Projects", icon: FolderKanban },
  { href: "/dashboard/documents", label: "Documents", icon: FolderOpen },
  { href: "/dashboard/notifications", label: "Notifications", icon: Bell },
  { href: "/dashboard/profile", label: "Profile", icon: User },
];

export function getPortalNavItems(type: ClientDashboardType): PortalNavItem[] {
  return type === "portfolio" ? PORTFOLIO_NAV : CONSTRUCTION_NAV;
}

export function getPortalSidebarTagline(type: ClientDashboardType): string {
  return type === "portfolio" ? "Portfolio" : "Intelligence";
}

export function getPortalSidebarFooter(type: ClientDashboardType): string {
  return type === "portfolio"
    ? "Curated project showcase"
    : "View-only project monitoring";
}

export function resolveClientDashboardType(
  user: Pick<User, "dashboard_type"> | null | undefined,
  client: Pick<Client, "dashboard_type"> | null | undefined
): ClientDashboardType {
  const userType = user?.dashboard_type;
  if (userType === "construction" || userType === "portfolio") {
    return userType;
  }
  const clientType = client?.dashboard_type;
  if (clientType === "construction" || clientType === "portfolio") {
    return clientType;
  }
  return "construction";
}
