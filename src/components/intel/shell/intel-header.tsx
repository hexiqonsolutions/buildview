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
  SlidersHorizontal,
  Building2,
  Layers,
  MapPin,
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { signOut } from "@/lib/actions/auth";
import type { User as UserType } from "@/lib/types";
import { NotificationBell } from "@/components/admin/notifications/notification-bell";
import { IntelCommandPalette } from "@/components/intel/shell/intel-command-palette";
import { usePortalWorkspaceHref } from "@/components/portal/workspace/use-portal-workspace-href";
import { usePortalWorkspace } from "@/components/portal/workspace/portal-workspace-provider";
import { usePathname } from "next/navigation";

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
  const [mobileScopeOpen, setMobileScopeOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const pathname = usePathname();
  const homeHref = usePortalWorkspaceHref("/dashboard");
  const notificationsHref = "/dashboard/notifications";
  const {
    hydrated,
    projects,
    scope,
    buildings,
    floors,
    clientName,
    dashboardType,
    setProjectId,
    setBuilding,
    setFloor,
  } = usePortalWorkspace();
  const isPortfolio = dashboardType === "portfolio";

  const showMobileWorkspace =
    hydrated &&
    projects.length > 0 &&
    !(isPortfolio && pathname === "/dashboard");

  const projectLabel =
    projects.find((p) => p.id === scope.projectId)?.name ||
    clientName?.trim() ||
    (isPortfolio ? "Showcase" : "Workspace");

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

  const showSpatial = Boolean(scope.projectId);
  const scopeControls = (
    <div className="space-y-3">
      <StackedSelect
        label="Project"
        icon={MapPin}
        value={scope.projectId ?? ""}
        onChange={(id) => setProjectId(id || null)}
        options={projects.map((p) => ({ value: p.id, label: p.name }))}
      />
      {!isPortfolio && showSpatial && buildings.length > 0 && (
        <StackedSelect
          label="Building"
          icon={Building2}
          value={scope.building}
          onChange={setBuilding}
          options={[
            { value: "all", label: "All buildings" },
            ...buildings.map((b) => ({ value: b, label: b })),
          ]}
        />
      )}
      {!isPortfolio &&
        showSpatial &&
        scope.building !== "all" &&
        floors.length > 0 && (
          <StackedSelect
            label="Floor"
            icon={Layers}
            value={scope.floor}
            onChange={setFloor}
            options={[
              { value: "all", label: "All floors" },
              ...floors.map((f) => ({ value: f, label: f })),
            ]}
          />
        )}
    </div>
  );

  return (
    <header className="intel-header border-b border-slate-200/40 dark:border-slate-800/40">
      {/* Primary bar — mirrors admin ops header */}
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

        <button
          type="button"
          onClick={() => setPaletteOpen(true)}
          className="ops-search-trigger hidden min-w-0 flex-1 lg:flex lg:max-w-[220px] xl:max-w-[260px]"
        >
          <Search className="h-4 w-4 shrink-0 text-slate-400" />
          <span className="truncate text-sm text-slate-500">Search...</span>
          <kbd className="ops-kbd ml-auto hidden xl:inline-flex">⌘K</kbd>
        </button>

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
            className="h-9 w-9 text-slate-500 lg:hidden"
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

      {/* Mobile workspace row — same structure as admin, without Upload */}
      {showMobileWorkspace && (
        <div className="flex items-center gap-2 border-t border-slate-100 px-3 py-2 lg:hidden dark:border-slate-800">
          <Sheet open={mobileScopeOpen} onOpenChange={setMobileScopeOpen}>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-9 min-w-0 flex-1 justify-start gap-2 border-slate-200 px-3 text-xs font-medium dark:border-slate-700"
              >
                <SlidersHorizontal className="h-3.5 w-3.5 shrink-0 text-slate-500" />
                <span className="truncate">{projectLabel}</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="max-h-[85vh] rounded-t-2xl">
              <SheetHeader className="text-left">
                <SheetTitle>{isPortfolio ? "Showcase" : "Workspace"}</SheetTitle>
              </SheetHeader>
              <div className="mt-4 space-y-3 pb-6">{scopeControls}</div>
            </SheetContent>
          </Sheet>
        </div>
      )}

      <IntelCommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
    </header>
  );
}

function StackedSelect({
  label,
  value,
  onChange,
  options,
  icon: Icon,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  icon: typeof MapPin;
}) {
  if (options.length === 0) return null;
  return (
    <div className="space-y-1.5">
      <Label className="flex items-center gap-1.5 text-xs text-slate-500">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </Label>
      <Select value={value || undefined} onValueChange={onChange}>
        <SelectTrigger className="h-10 w-full border-slate-200 bg-white text-sm dark:border-slate-700 dark:bg-slate-900">
          <SelectValue placeholder={`Select ${label.toLowerCase()}`} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
