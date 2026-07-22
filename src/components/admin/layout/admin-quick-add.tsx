"use client";

import Link from "next/link";
import {
  Users,
  FolderKanban,
  Camera,
  FileText,
  FolderOpen,
  Receipt,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const quickActions = [
  { href: "/admin/clients", label: "Create Client", icon: Users },
  { href: "/admin/projects", label: "Create Project", icon: FolderKanban },
  { href: "/admin/tours", label: "Upload Matterport Tour", icon: Camera },
  { href: "/admin/reports", label: "Upload Report", icon: FileText },
  { href: "/admin/documents", label: "Upload Drawing", icon: FolderOpen },
  { href: "/admin/invoices", label: "Generate Invoice", icon: Receipt },
] as const;

export function AdminQuickAdd() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="default"
          size="sm"
          className="h-9 gap-1.5 bg-slate-900 px-2.5 hover:bg-slate-800 sm:px-3"
          aria-label="Quick Add"
        >
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Quick Add</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Quick Actions</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {quickActions.map((action) => (
          <DropdownMenuItem key={action.href} asChild>
            <Link href={action.href} className="cursor-pointer">
              <action.icon className="mr-2 h-4 w-4" />
              {action.label}
            </Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
