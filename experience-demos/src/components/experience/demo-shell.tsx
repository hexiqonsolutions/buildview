"use client";

import type { ComponentType, ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2,
  Camera,
  FolderKanban,
  Home,
  LayoutDashboard,
  Map,
} from "lucide-react";
import { cn, getInitials } from "@/lib/utils";
import { DemoBanner } from "./demo-banner";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

type NavItem = { href: string; label: string; icon: ComponentType<{ className?: string }> };

export function DemoShell({
  mode,
  basePath,
  clientName,
  firstName,
  fullName,
  children,
}: {
  mode: "construction" | "portfolio";
  basePath: "/construction" | "/interior" | "/real-estate";
  clientName: string;
  firstName: string;
  fullName: string;
  children: ReactNode;
}) {
  const pathname = usePathname();

  const nav: NavItem[] =
    mode === "construction"
      ? [
          { href: basePath, label: "Intelligence", icon: LayoutDashboard },
          { href: `${basePath}/projects/exp-construction-meridian-tower`, label: "Project", icon: FolderKanban },
          { href: `${basePath}/compare`, label: "Compare scans", icon: Map },
        ]
      : [
          { href: basePath, label: "Showcase", icon: Home },
        ];

  return (
    <div className="intel-shell">
      <DemoBanner />
      <aside className="intel-sidebar z-40 hidden flex-col lg:flex">
        <div className="flex h-16 items-center gap-2 border-b border-slate-200/70 px-5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/db-logo.png" alt="BuildView" className="h-8 w-auto" />
          <div className="min-w-0">
            <p className="truncate text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
              Experience
            </p>
            <p className="truncate text-sm font-semibold text-slate-900">{clientName}</p>
          </div>
        </div>
        <nav className="flex flex-1 flex-col gap-1 p-3">
          {nav.map((item) => {
            const active =
              pathname === item.href ||
              (item.href !== basePath && pathname.startsWith(item.href));
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "intel-nav-item",
                  active && "intel-nav-item-active"
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-slate-200/70 p-4">
          <div className="flex items-center gap-3">
            <Avatar className="h-9 w-9">
              <AvatarFallback className="bg-slate-900 text-xs text-white">
                {getInitials(fullName)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-slate-900">{firstName}</p>
              <p className="truncate text-[11px] text-slate-500">
                {mode === "construction" ? "Construction Intelligence" : "Portfolio Showcase"}
              </p>
            </div>
          </div>
        </div>
      </aside>

      <div className="intel-main">
        <header className="intel-header-stack">
          <div className="intel-header flex items-center justify-between gap-3 px-4 py-3 lg:px-8">
            <div className="flex min-w-0 items-center gap-2 lg:hidden">
              <Building2 className="h-4 w-4 text-slate-500" />
              <p className="truncate text-sm font-semibold text-slate-900">{clientName}</p>
            </div>
            <div className="hidden items-center gap-2 text-xs text-slate-500 lg:flex">
              <Camera className="h-3.5 w-3.5" />
              Preloaded Matterport walkthroughs
            </div>
            <div className="flex gap-1 overflow-x-auto lg:hidden">
              {nav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "rounded-lg px-2.5 py-1.5 text-xs font-medium whitespace-nowrap",
                    pathname === item.href || (item.href !== basePath && pathname.startsWith(item.href))
                      ? "bg-slate-900 text-white"
                      : "bg-slate-100 text-slate-600"
                  )}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        </header>
        <main className="intel-content">{children}</main>
      </div>
    </div>
  );
}
