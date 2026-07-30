"use client";

import Link from "next/link";
import {
  FolderKanban,
  FileText,
  FolderOpen,
  AlertTriangle,
  Columns2,
  ReceiptIndianRupee,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { canViewClientInvoices } from "@/lib/auth/permissions";
import type { UserRole } from "@/lib/types";

const baseLinks: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/dashboard/projects", label: "Projects", icon: FolderKanban },
  { href: "/dashboard/matterport-comparison", label: "Matterport Compare", icon: Columns2 },
  { href: "/dashboard/reports", label: "Reports", icon: FileText },
  { href: "/dashboard/documents", label: "Documents", icon: FolderOpen },
  { href: "/dashboard/issues", label: "Issues", icon: AlertTriangle },
];

export function QuickLinks({ userRole }: { userRole?: UserRole }) {
  const links =
    userRole && canViewClientInvoices(userRole)
      ? [
          ...baseLinks,
          { href: "/dashboard/invoices", label: "Invoices", icon: ReceiptIndianRupee },
        ]
      : baseLinks;

  return (
    <div
      className={cn(
        "grid grid-cols-2 gap-3 sm:grid-cols-3",
        links.length >= 6 ? "lg:grid-cols-6" : "lg:grid-cols-5"
      )}
    >
      {links.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className="group surface-card flex flex-col items-center gap-2.5 p-4 transition-all hover:-translate-y-0.5 hover:shadow-soft"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-accent/10 ring-1 ring-brand-accent/15 transition-transform group-hover:scale-105">
            <link.icon className="h-5 w-5 text-brand-accent-dark" strokeWidth={1.75} />
          </div>
          <span className="text-sm font-medium text-brand-primary dark:text-white">
            {link.label}
          </span>
        </Link>
      ))}
    </div>
  );
}
