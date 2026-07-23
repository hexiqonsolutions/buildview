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
  LayoutDashboard,
  Upload,
  Building2,
  Layers,
  SlidersHorizontal,
} from "lucide-react";
import { BrandLogo } from "@/components/brand/brand-logo";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { useAdminWorkspace } from "@/components/admin/workspace/admin-workspace-provider";
import { useAdminWorkspaceHref } from "@/components/admin/workspace/use-admin-workspace-href";
import { OpsCommandPalette } from "@/components/admin/layout/ops-command-palette";
import { NotificationBell } from "@/components/admin/notifications/notification-bell";
import { signOut } from "@/lib/actions/auth";
import { cn } from "@/lib/utils";
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
  const {
    hydrated,
    client,
    clients,
    clientProjects,
    buildings,
    floors,
    scope,
    setClientId,
    setProjectId,
    setBuilding,
    setFloor,
  } = useAdminWorkspace();

  const [darkMode, setDarkMode] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [mobileScopeOpen, setMobileScopeOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const homeHref = useAdminWorkspaceHref("/admin");
  const uploadHref = useAdminWorkspaceHref("/admin/upload");
  const notificationsHref = useAdminWorkspaceHref("/admin/notifications");

  const displayName = user.full_name?.trim() || user.email?.split("@")[0] || "Admin";
  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const clientLabel =
    clients.find((c) => c.id === scope.clientId)?.company_name ||
    clients.find((c) => c.id === scope.clientId)?.name ||
    "Client";

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

  const scopeControls = (
    <WorkspaceScopeControls
      scope={scope}
      clients={clients}
      clientProjects={clientProjects}
      buildings={buildings}
      floors={floors}
      clientLogoUrl={client?.logo_url}
      setClientId={setClientId}
      setProjectId={setProjectId}
      setBuilding={setBuilding}
      setFloor={setFloor}
      stacked
    />
  );

  return (
    <>
      <header className="ops-command-header border-b border-slate-200/80 dark:border-slate-800">
        <div className="flex h-14 items-center gap-2 px-3 lg:gap-3 lg:px-5">
          <div className="flex shrink-0 items-center gap-1.5 lg:hidden">
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
            <BrandLogo href={homeHref} size="md" className="shrink-0 max-w-[8.5rem]" />
          </div>

          <button
            type="button"
            onClick={() => setPaletteOpen(true)}
            className="ops-search-trigger hidden h-9 min-w-0 flex-1 sm:flex lg:max-w-[220px] xl:max-w-[260px]"
          >
            <Search className="h-4 w-4 shrink-0 text-slate-400" />
            <span className="truncate text-sm text-slate-500">Search...</span>
            <kbd className="ops-kbd ml-auto hidden xl:inline-flex">⌘K</kbd>
          </button>

          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 shrink-0 text-slate-500 sm:hidden"
            onClick={() => setPaletteOpen(true)}
            aria-label="Search"
          >
            <Search className="h-4 w-4" />
          </Button>

          {hydrated ? (
            <div className="hidden min-w-0 flex-1 lg:block">
              <WorkspaceScopeControls
                scope={scope}
                clients={clients}
                clientProjects={clientProjects}
                buildings={buildings}
                floors={floors}
                clientLogoUrl={client?.logo_url}
                setClientId={setClientId}
                setProjectId={setProjectId}
                setBuilding={setBuilding}
                setFloor={setFloor}
              />
            </div>
          ) : (
            <div className="hidden h-9 flex-1 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800 lg:block" />
          )}

          <div className="ml-auto flex shrink-0 items-center gap-0.5 sm:gap-1">
            {hydrated && (
              <Sheet open={mobileScopeOpen} onOpenChange={setMobileScopeOpen}>
                <SheetTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 max-w-[9.5rem] gap-1.5 border-slate-200 px-2.5 text-xs font-medium lg:hidden dark:border-slate-700"
                  >
                    <SlidersHorizontal className="h-3.5 w-3.5 shrink-0 text-slate-500" />
                    <span className="truncate">{clientLabel}</span>
                  </Button>
                </SheetTrigger>
                <SheetContent side="bottom" className="max-h-[85vh] rounded-t-2xl">
                  <SheetHeader className="text-left">
                    <SheetTitle>Workspace</SheetTitle>
                  </SheetHeader>
                  <div className="mt-4 space-y-3 pb-6">{scopeControls}</div>
                </SheetContent>
              </Sheet>
            )}

            <Button
              size="sm"
              className="ops-btn-primary h-9 gap-1.5 px-2.5 sm:px-3"
              asChild
            >
              <Link href={uploadHref} aria-label="Upload">
                <Upload className="h-4 w-4" />
                <span className="hidden sm:inline">Upload</span>
              </Link>
            </Button>

            <NotificationBell
              initialCount={unreadNotifications}
              userId={user.id}
              href={notificationsHref}
            />

            <Button
              variant="ghost"
              size="icon"
              onClick={toggleDarkMode}
              className="h-9 w-9 text-slate-500"
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
                  className="h-9 max-w-[148px] gap-2 rounded-full pl-1 pr-2"
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
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/profile">
                    <User className="mr-2 h-4 w-4" /> Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/dashboard">
                    <LayoutDashboard className="mr-2 h-4 w-4" /> Client Portal
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

type ScopeOption = { value: string; label: string };

function WorkspaceScopeControls({
  scope,
  clients,
  clientProjects,
  buildings,
  floors,
  clientLogoUrl,
  setClientId,
  setProjectId,
  setBuilding,
  setFloor,
  stacked = false,
}: {
  scope: {
    clientId: string | null;
    projectId: string | null;
    building: string;
    floor: string;
  };
  clients: Array<{ id: string; name: string; company_name?: string | null; logo_url?: string | null }>;
  clientProjects: Array<{ id: string; name: string }>;
  buildings: string[];
  floors: string[];
  clientLogoUrl?: string | null;
  setClientId: (id: string | null) => void;
  setProjectId: (id: string | null) => void;
  setBuilding: (building: string) => void;
  setFloor: (floor: string) => void;
  stacked?: boolean;
}) {
  const clientOptions: ScopeOption[] = clients.map((c) => ({
    value: c.id,
    label: c.company_name || c.name,
  }));
  const projectOptions: ScopeOption[] = clientProjects.map((p) => ({
    value: p.id,
    label: p.name,
  }));
  const buildingOptions: ScopeOption[] = [
    { value: "all", label: "All buildings" },
    ...buildings.map((b) => ({ value: b, label: b })),
  ];
  const floorOptions: ScopeOption[] = [
    { value: "all", label: "All floors" },
    ...floors.map((f) => ({ value: f, label: f })),
  ];

  if (stacked) {
    return (
      <div className="space-y-3">
        {clientOptions.length === 0 ? (
          <div className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm">
            <p className="text-xs font-medium text-muted-foreground">Client</p>
            <Link href="/admin/clients" className="mt-1 inline-block font-medium text-foreground underline-offset-2 hover:underline">
              Add a client first
            </Link>
          </div>
        ) : (
          <StackedSelect
            label="Client"
            value={scope.clientId ?? ""}
            onChange={(v) => setClientId(v || null)}
            options={clientOptions}
            placeholder="Select client"
          />
        )}
        <StackedSelect
          label="Project"
          value={scope.projectId ?? ""}
          onChange={(v) => setProjectId(v || null)}
          options={projectOptions}
          placeholder={scope.clientId ? "No projects yet" : "Select client first"}
          disabled={!scope.clientId || projectOptions.length === 0}
        />
        <StackedSelect
          label="Building"
          value={scope.building}
          onChange={setBuilding}
          options={buildingOptions}
          placeholder={!scope.projectId ? "Select project first" : "All buildings"}
          disabled={!scope.projectId}
        />
        <StackedSelect
          label="Floor"
          value={scope.floor}
          onChange={setFloor}
          options={floorOptions}
          placeholder={!scope.projectId ? "Select project first" : "All floors"}
          disabled={!scope.projectId}
        />
      </div>
    );
  }

  return (
    <div className="ops-scope-cluster" role="group" aria-label="Workspace filters">
      {clientOptions.length === 0 ? (
        <Link
          href="/admin/clients"
          className="inline-flex h-9 min-w-[11rem] shrink-0 items-center gap-1.5 px-2.5 text-xs font-medium text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
        >
          <Building2 className="h-3.5 w-3.5 text-slate-400" />
          Add a client
        </Link>
      ) : (
        <ScopeSelect
          ariaLabel="Client"
          value={scope.clientId ?? ""}
          onChange={(v) => setClientId(v || null)}
          options={clientOptions}
          placeholder="Client"
          className="w-[min(100%,11rem)] shrink-0 sm:w-44"
          leading={
            clientLogoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={clientLogoUrl} alt="" className="h-4 w-4 rounded object-cover" />
            ) : (
              <Building2 className="h-3.5 w-3.5 text-slate-400" />
            )
          }
        />
      )}
      <ScopeDivider />
      <ScopeSelect
        ariaLabel="Project"
        value={scope.projectId ?? ""}
        onChange={(v) => setProjectId(v || null)}
        options={projectOptions}
        placeholder="Project"
        disabled={!scope.clientId}
        emptyHint={!scope.clientId ? "Select client" : "No projects"}
        className="w-[min(100%,10.5rem)] shrink-0 sm:w-40"
      />
      <ScopeDivider />
      <ScopeSelect
        ariaLabel="Building"
        value={scope.building}
        onChange={setBuilding}
        options={buildingOptions}
        placeholder="Building"
        disabled={!scope.projectId}
        emptyHint="Select project"
        className="w-[8.5rem] shrink-0"
        leading={<Layers className="h-3.5 w-3.5 text-slate-400" />}
      />
      <ScopeDivider />
      <ScopeSelect
        ariaLabel="Floor"
        value={scope.floor}
        onChange={setFloor}
        options={floorOptions}
        placeholder="Floor"
        disabled={!scope.projectId}
        emptyHint="Select project"
        className="w-[7.5rem] shrink-0"
      />
    </div>
  );
}

function ScopeDivider({ className }: { className?: string }) {
  return (
    <div
      className={cn("h-5 w-px shrink-0 bg-slate-200 dark:bg-slate-700", className)}
      aria-hidden
    />
  );
}

function ScopeSelect({
  ariaLabel,
  value,
  onChange,
  options,
  placeholder,
  disabled,
  leading,
  className,
  emptyHint,
}: {
  ariaLabel: string;
  value: string;
  onChange: (v: string) => void;
  options: ScopeOption[];
  placeholder: string;
  disabled?: boolean;
  leading?: React.ReactNode;
  className?: string;
  emptyHint?: string;
}) {
  const isEmpty = options.length === 0;
  const isDisabled = Boolean(disabled) || isEmpty;

  return (
    <div className={cn("flex min-w-0 items-center", className)}>
      {leading ? (
        <span className="pointer-events-none shrink-0 pl-2.5">{leading}</span>
      ) : null}
      <Select
        value={!isDisabled && value ? value : undefined}
        onValueChange={onChange}
        disabled={isDisabled}
      >
        <SelectTrigger
          aria-label={ariaLabel}
          className={cn(
            "ops-scope-select h-9 min-w-0 flex-1 border-0 bg-transparent px-2 text-xs shadow-none focus:ring-0 focus:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-100",
            leading && "pl-1.5",
            isDisabled && "text-slate-400"
          )}
        >
          <SelectValue
            placeholder={
              isDisabled
                ? emptyHint || (isEmpty ? `No ${placeholder.toLowerCase()}s` : placeholder)
                : placeholder
            }
          />
        </SelectTrigger>
        {!isEmpty && (
          <SelectContent>
            {options.map((o) => (
              <SelectItem key={o.value} value={o.value} className="text-xs">
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        )}
      </Select>
    </div>
  );
}

function StackedSelect({
  label,
  value,
  onChange,
  options,
  placeholder,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: ScopeOption[];
  placeholder?: string;
  disabled?: boolean;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-slate-400">
        {label}
      </label>
      <Select
        value={disabled || options.length === 0 ? undefined : value || undefined}
        onValueChange={onChange}
        disabled={disabled || options.length === 0}
      >
        <SelectTrigger className="h-10 border-slate-200 bg-white text-sm dark:border-slate-700 dark:bg-slate-900 disabled:opacity-100">
          <SelectValue placeholder={placeholder ?? label} />
        </SelectTrigger>
        {options.length > 0 && (
          <SelectContent>
            {options.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        )}
      </Select>
    </div>
  );
}
