"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Calendar, Columns2, FileText, FolderKanban } from "lucide-react";
import { usePortalWorkspaceQuery } from "@/components/portal/workspace/use-portal-workspace-href";
import { withPortalWorkspaceQuery } from "@/lib/portal/nav";
import { usePortalWorkspace } from "@/components/portal/workspace/portal-workspace-provider";
import { cn } from "@/lib/utils";

const constructionLinks = [
  { href: "/dashboard/projects", label: "Projects", icon: FolderKanban },
  { href: "/dashboard/matterport-comparison", label: "Compare", icon: Columns2, highlight: true },
  { href: "/dashboard/timeline", label: "Timeline", icon: Calendar },
  { href: "/dashboard/reports", label: "Reports", icon: FileText },
] as const;

const portfolioLinks = [
  { href: "/dashboard/projects", label: "Projects", icon: FolderKanban, highlight: true },
] as const;

export function IntelQuickAccess() {
  const pathname = usePathname();
  const workspaceQuery = usePortalWorkspaceQuery();
  const { dashboardType } = usePortalWorkspace();

  // Portfolio home is a curated showcase — skip the utility strip.
  if (dashboardType === "portfolio" && pathname === "/dashboard") {
    return null;
  }

  const quickLinks = dashboardType === "portfolio" ? portfolioLinks : constructionLinks;

  return (
    <div className="intel-quick-access">
      <div className="flex items-center gap-2 overflow-x-auto px-4 py-2.5 lg:px-8">
        {quickLinks.map((link) => {
          const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
          const href = withPortalWorkspaceQuery(link.href, workspaceQuery);
          return (
            <Link
              key={link.href}
              href={href}
              className={cn(
                "inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium transition-all",
                "highlight" in link && link.highlight
                  ? "bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900"
                  : active
                    ? "bg-slate-200/80 text-slate-900 dark:bg-slate-800 dark:text-white"
                    : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800/60"
              )}
            >
              <link.icon className="h-3.5 w-3.5" />
              {link.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
