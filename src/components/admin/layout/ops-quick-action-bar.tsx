"use client";

import Link from "next/link";
import {
  Camera,
  FileText,
  FolderOpen,
  ImageIcon,
  Calendar,
  Receipt,
  FolderKanban,
  Users,
} from "lucide-react";
import { useAdminWorkspaceQuery } from "@/components/admin/workspace/use-admin-workspace-href";
import { withAdminWorkspaceQuery } from "@/lib/admin/nav";
import { cn } from "@/lib/utils";

const actions = [
  { href: "/admin/upload?type=matterport", label: "Matterport", icon: Camera },
  { href: "/admin/upload?type=report", label: "Report", icon: FileText },
  { href: "/admin/upload?type=drawing", label: "Drawing", icon: FolderOpen },
  { href: "/admin/upload?type=photo", label: "Photos", icon: ImageIcon },
  { href: "/admin/timeline", label: "Timeline", icon: Calendar },
  { href: "/admin/invoices", label: "Invoice", icon: Receipt },
  { href: "/admin/projects", label: "Project", icon: FolderKanban },
  { href: "/admin/clients", label: "Client", icon: Users },
] as const;

export function OpsQuickActionBar() {
  const workspaceQuery = useAdminWorkspaceQuery();

  return (
    <div className="ops-quick-bar">
      <div className="flex items-center gap-1.5 overflow-x-auto px-3 py-2 [scrollbar-width:none] [-ms-overflow-style:none] lg:gap-2 lg:px-5 [&::-webkit-scrollbar]:hidden">
        <span className="hidden shrink-0 pr-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400 md:inline">
          Quick add
        </span>
        {actions.map((action) => {
          const href = withAdminWorkspaceQuery(action.href, workspaceQuery);
          return (
            <Link
              key={action.href}
              href={href}
              className={cn(
                "ops-quick-action inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors sm:px-3",
                action.label === "Matterport" && "ops-quick-action-primary"
              )}
            >
              <action.icon className="h-3.5 w-3.5" />
              <span>{action.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
