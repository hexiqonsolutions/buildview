import type { User as AuthUser } from "@/lib/types";
import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  FolderKanban,
  Columns2,
  Calendar,
  FileText,
  FolderOpen,
  AlertTriangle,
  ReceiptIndianRupee,
  Building2,
  UsersRound,
} from "lucide-react";

/**
 * Client portal experiences. Keys are stored in the database and never renamed;
 * labels are what clients and staff see.
 *
 *   construction → Construction Intelligence (live site monitoring)
 *   portfolio    → Interior Showcase (finished design work)
 *   property     → Real Estate Showcase (property pages + buyer leads)
 */
export const CLIENT_DASHBOARD_TYPES = ["construction", "portfolio", "property"] as const;
export type ClientDashboardType = (typeof CLIENT_DASHBOARD_TYPES)[number];

export const CLIENT_DASHBOARD_TYPE_LABELS: Record<ClientDashboardType, string> = {
  construction: "Construction Intelligence",
  portfolio: "Interior Showcase",
  property: "Real Estate Showcase",
};

export const CLIENT_DASHBOARD_TYPE_DESCRIPTIONS: Record<ClientDashboardType, string> = {
  construction:
    "Progress, timeline, reports and issues for sites under construction.",
  portfolio:
    "Walkthroughs, photos and videos of finished interior and architecture work.",
  property:
    "Buyer-ready property pages, shareable walkthroughs and buyer leads for developers.",
};

export function isClientDashboardType(value: unknown): value is ClientDashboardType {
  return typeof value === "string" && (CLIENT_DASHBOARD_TYPES as readonly string[]).includes(value);
}

/**
 * Showcase portals (Interior + Real Estate) share the walkthrough-first layout
 * and hide construction-only modules (progression, issues, timeline, reports…).
 */
export function isShowcaseDashboard(type: ClientDashboardType | null | undefined): boolean {
  return type === "portfolio" || type === "property";
}

/** Real Estate Showcase only: property details, buyer leads. */
export function isPropertyDashboard(type: ClientDashboardType | null | undefined): boolean {
  return type === "property";
}

type PortalNavItem = {
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
  { href: "/dashboard/invoices", label: "Invoices", icon: ReceiptIndianRupee },
];

const PORTFOLIO_NAV: PortalNavItem[] = [
  { href: "/dashboard", label: "Portfolio", icon: LayoutDashboard, exact: true },
  { href: "/dashboard/projects", label: "Projects", icon: FolderKanban },
  { href: "/dashboard/documents", label: "Documents", icon: FolderOpen },
];

const PROPERTY_NAV: PortalNavItem[] = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/dashboard/projects", label: "Properties", icon: Building2 },
  { href: "/dashboard/leads", label: "Buyer leads", icon: UsersRound },
  { href: "/dashboard/documents", label: "Documents", icon: FolderOpen },
];

const NAV_BY_TYPE: Record<ClientDashboardType, PortalNavItem[]> = {
  construction: CONSTRUCTION_NAV,
  portfolio: PORTFOLIO_NAV,
  property: PROPERTY_NAV,
};

export function getPortalNavItems(
  type: ClientDashboardType,
  options?: { includeInvoices?: boolean }
): PortalNavItem[] {
  const items = NAV_BY_TYPE[type] ?? CONSTRUCTION_NAV;
  // Invoices are Client Admin only — omit unless explicitly opted in.
  if (options?.includeInvoices !== true) {
    return items.filter((item) => item.href !== "/dashboard/invoices");
  }
  return items;
}

export function getPortalSidebarTagline(type: ClientDashboardType): string {
  return { construction: "Intelligence", portfolio: "Interiors", property: "Real Estate" }[type];
}

export function getPortalSidebarFooter(type: ClientDashboardType): string {
  return {
    construction: "View-only project monitoring",
    portfolio: "Curated project showcase",
    property: "Property showcase & buyer leads",
  }[type];
}

/** Portal header title + subtitle per experience. */
export const PORTAL_HEADER_COPY: Record<ClientDashboardType, { title: string; subtitle: string }> = {
  construction: { title: "Construction Intelligence", subtitle: "Live site progress and reports" },
  portfolio: { title: "Interior Showcase", subtitle: "Curated walkthroughs and project highlights" },
  property: { title: "Real Estate Showcase", subtitle: "Your properties and buyer interest" },
};

export function resolveClientDashboardType(
  user: Pick<AuthUser, "dashboard_type"> | null | undefined,
  client: { dashboard_type?: ClientDashboardType | null } | null | undefined
): ClientDashboardType {
  const userType = user?.dashboard_type;
  if (isClientDashboardType(userType)) {
    return userType;
  }
  const clientType = client?.dashboard_type;
  if (isClientDashboardType(clientType)) {
    return clientType;
  }
  return "construction";
}
