"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import {
  Menu,
  X,
  Search,
  Moon,
  Sun,
  LogOut,
  User,
  LifeBuoy,
} from "lucide-react";
import { BrandLogo } from "@/components/brand/brand-logo";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAdminWorkspaceHref } from "@/components/admin/workspace/use-admin-workspace-href";
import { OpsCommandPalette } from "@/components/admin/layout/ops-command-palette";
import { NotificationBell } from "@/components/admin/notifications/notification-bell";
import { signOut } from "@/lib/actions/auth";
import { getInitials } from "@/lib/utils";
import type { User as UserType } from "@/lib/types";

interface OpsCommandHeaderProps {
  user: UserType;
  onMenuClick: () => void;
  menuOpen?: boolean;
  unreadNotifications?: number;
}

export function OpsCommandHeader({
  user,
  onMenuClick,
  menuOpen = false,
  unreadNotifications = 0,
}: OpsCommandHeaderProps) {
  const [darkMode, setDarkMode] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const homeHref = useAdminWorkspaceHref("/admin");
  const displayName = user.full_name?.trim() || user.email?.split("@")[0] || "Admin";
  const initials = getInitials(displayName);

  useEffect(() => {
    const stored = localStorage.getItem("theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const isDark = stored === "dark" || (!stored && prefersDark);
    setDarkMode(isDark);
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

  return (
    <>
      <header className="ops-command-header border-b border-slate-200/80 dark:border-slate-800">
        <div className="flex h-14 items-center gap-2 px-3 lg:gap-3 lg:px-5">
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
            <BrandLogo href={homeHref} size="xl" className="min-w-0 max-w-44 shrink overflow-hidden" />
          </div>

          <div className="ml-auto flex shrink-0 items-center gap-1 border-l border-slate-100 pl-2 dark:border-slate-800 sm:gap-1.5 sm:pl-3 lg:ml-0 lg:border-l-0 lg:pl-0">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-slate-500"
              onClick={() => setPaletteOpen(true)}
              aria-label="Search"
            >
              <Search className="h-4 w-4" />
            </Button>

            <NotificationBell initialCount={unreadNotifications} userId={user.id} />

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
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col gap-0.5">
                    <span className="truncate font-medium">{displayName}</span>
                    <span className="truncate text-xs font-normal text-muted-foreground">
                      {user.email}
                    </span>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="lg:hidden"
                  onClick={() => toggleDarkMode()}
                >
                  {darkMode ? (
                    <Sun className="mr-2 h-4 w-4" />
                  ) : (
                    <Moon className="mr-2 h-4 w-4" />
                  )}
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
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  disabled={isPending}
                  onClick={() => startTransition(() => signOut())}
                  className="text-red-600 focus:text-red-600"
                >
                  <LogOut className="mr-2 h-4 w-4" /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <OpsCommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
    </>
  );
}
