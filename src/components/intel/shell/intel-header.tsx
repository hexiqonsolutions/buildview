"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import {
  Menu,
  X,
  LogOut,
  User,
  Moon,
  Sun,
  Shield,
  Search,
  LifeBuoy,
} from "lucide-react";
import { BrandLogo } from "@/components/brand/brand-logo";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { signOut } from "@/lib/actions/auth";
import type { User as UserType } from "@/lib/types";
import { NotificationBell } from "@/components/admin/notifications/notification-bell";
import { IntelCommandPalette } from "@/components/intel/shell/intel-command-palette";
import { usePortalWorkspaceHref } from "@/components/portal/workspace/use-portal-workspace-href";
import { usePortalWorkspace } from "@/components/portal/workspace/portal-workspace-provider";

interface IntelHeaderProps {
  user: UserType;
  onMenuClick: () => void;
  menuOpen?: boolean;
  unreadNotifications?: number;
}

export function IntelHeader({
  user,
  onMenuClick,
  menuOpen = false,
  unreadNotifications = 0,
}: IntelHeaderProps) {
  const [darkMode, setDarkMode] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const homeHref = usePortalWorkspaceHref("/dashboard");
  const notificationsHref = "/dashboard/notifications";
  const { dashboardType } = usePortalWorkspace();
  const isPortfolio = dashboardType === "portfolio";

  useEffect(() => {
    const stored = localStorage.getItem("theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    setDarkMode(stored === "dark" || (!stored && prefersDark));
  }, []);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen(true);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  function toggleDarkMode() {
    const next = !darkMode;
    setDarkMode(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  }

  const displayName = user.full_name?.trim() || user.email?.split("@")[0] || "User";
  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <header className="intel-header border-b border-slate-200/40 dark:border-slate-800/40">
      <div className="flex h-14 items-center gap-2 px-3 lg:gap-3 lg:px-8">
        <div className="flex min-w-0 shrink-0 items-center gap-1 lg:hidden">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 shrink-0"
            onClick={onMenuClick}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
          <BrandLogo href={homeHref} size="md" className="min-w-0 max-w-[7.5rem] shrink" />
        </div>

        <div className="hidden min-w-0 flex-1 lg:block">
          <p className="font-display text-sm font-semibold text-slate-800 dark:text-slate-100">
            {isPortfolio ? "Portfolio Showcase" : "Construction Intelligence"}
          </p>
          <p className="text-xs text-slate-500">
            {isPortfolio
              ? "Curated walkthroughs and project highlights"
              : "Monitor progress across your projects"}
          </p>
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-slate-500"
            onClick={() => setPaletteOpen(true)}
            aria-label="Search"
          >
            <Search className="h-4 w-4" />
          </Button>

          {user.role === "super_admin" && (
            <Button
              variant="ghost"
              size="sm"
              className="hidden h-9 text-slate-600 lg:inline-flex"
              asChild
            >
              <Link href="/admin">
                <Shield className="mr-1.5 h-3.5 w-3.5" />
                Admin
              </Link>
            </Button>
          )}

          <NotificationBell
            initialCount={unreadNotifications}
            userId={user.id}
            href={notificationsHref}
          />

          <Button
            variant="ghost"
            size="icon"
            onClick={toggleDarkMode}
            className="hidden h-9 w-9 text-slate-500 lg:inline-flex"
            aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
          >
            {darkMode ? (
              <Sun className="h-[18px] w-[18px]" />
            ) : (
              <Moon className="h-[18px] w-[18px]" />
            )}
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-full p-0 lg:h-9 lg:w-auto lg:gap-2 lg:rounded-full lg:pl-1 lg:pr-2"
              >
                <Avatar className="h-7 w-7 shrink-0">
                  <AvatarImage src={user.avatar_url || undefined} alt={displayName} />
                  <AvatarFallback className="bg-slate-900 text-[11px] font-semibold text-white">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden truncate text-sm font-medium xl:inline">
                  {displayName.split(" ")[0]}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end">
              <DropdownMenuLabel>
                <div className="flex flex-col gap-0.5">
                  <span className="truncate font-medium">{displayName}</span>
                  <span className="truncate text-xs font-normal text-muted-foreground">
                    {user.email}
                  </span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="lg:hidden" onClick={() => toggleDarkMode()}>
                {darkMode ? <Sun className="mr-2 h-4 w-4" /> : <Moon className="mr-2 h-4 w-4" />}
                {darkMode ? "Light mode" : "Dark mode"}
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/dashboard/profile">
                  <User className="mr-2 h-4 w-4" /> Profile
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/dashboard/support">
                  <LifeBuoy className="mr-2 h-4 w-4" /> Support
                </Link>
              </DropdownMenuItem>
              {user.role === "super_admin" && (
                <DropdownMenuItem asChild>
                  <Link href="/admin">
                    <Shield className="mr-2 h-4 w-4" /> Admin Panel
                  </Link>
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => startTransition(() => signOut())}
                disabled={isPending}
                className="text-red-600 focus:text-red-600"
              >
                <LogOut className="mr-2 h-4 w-4" /> Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <IntelCommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
    </header>
  );
}
