"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Building2,
  ChevronDown,
  ExternalLink,
  Search,
  ShieldCheck,
  UserX,
  Users,
  type LucideIcon,
} from "lucide-react";
import { ManageUserDialog } from "@/components/admin/manage-user-dialog";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { AdminUserRow } from "@/lib/data/users";
import type { UserGroup, UserGroupKind } from "@/lib/admin/user-groups";
import {
  CLIENT_DASHBOARD_TYPE_LABELS,
  resolveClientDashboardType,
} from "@/lib/portal/dashboard-type";
import { USER_ROLE_LABELS, type Client, type Project } from "@/lib/types";
import { cn, formatDate, formatRelativeTime, getInitials } from "@/lib/utils";

const GROUP_STYLES: Record<UserGroupKind, { icon: LucideIcon; tile: string }> = {
  staff: {
    icon: ShieldCheck,
    tile: "bg-slate-900 text-white dark:bg-white dark:text-slate-900",
  },
  organization: {
    icon: Building2,
    tile: "bg-brand-accent/15 text-slate-900 dark:text-white",
  },
  unassigned: {
    icon: UserX,
    tile: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
  },
};

function plural(count: number, word: string) {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}

function matchesQuery(user: AdminUserRow, group: UserGroup, query: string) {
  return [user.full_name, user.email, USER_ROLE_LABELS[user.role], group.name]
    .filter(Boolean)
    .some((value) => value.toLowerCase().includes(query));
}

function SummaryStat({ label, value, hint }: { label: string; value: number; hint?: string }) {
  return (
    <div className="ops-card p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 font-display text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

interface UserDirectoryProps {
  groups: UserGroup[];
  clients: Client[];
  projects: Project[];
  canAssignRoles: boolean;
}

export function UserDirectory({ groups, clients, projects, canAssignRoles }: UserDirectoryProps) {
  const [query, setQuery] = useState("");
  const [collapsed, setCollapsed] = useState<Set<string>>(
    () => new Set(groups.filter((g) => g.users.length === 0).map((g) => g.id))
  );

  const normalizedQuery = query.trim().toLowerCase();

  const visibleGroups = useMemo(() => {
    if (!normalizedQuery) return groups;
    return groups
      .map((group) => ({
        ...group,
        users: group.users.filter((u) => matchesQuery(u, group, normalizedQuery)),
      }))
      .filter((group) => group.users.length > 0);
  }, [groups, normalizedQuery]);

  const organizations = groups.filter((g) => g.kind === "organization");
  const totalAccounts = groups.reduce((sum, g) => sum + g.users.length, 0);
  const staffCount = groups.find((g) => g.kind === "staff")?.users.length ?? 0;
  const unassignedCount = groups.find((g) => g.kind === "unassigned")?.users.length ?? 0;
  const orgsWithAccounts = organizations.filter((g) => g.users.length > 0).length;

  function toggle(groupId: string) {
    setCollapsed((current) => {
      const next = new Set(current);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <SummaryStat label="Total accounts" value={totalAccounts} />
        <SummaryStat label="BuildView team" value={staffCount} hint="Staff with console access" />
        <SummaryStat
          label="Organizations"
          value={organizations.length}
          hint={`${orgsWithAccounts} with portal accounts`}
        />
        <SummaryStat
          label="No organization"
          value={unassignedCount}
          hint={unassignedCount > 0 ? "Assign them to a client" : "Everyone is assigned"}
        />
      </div>

      <div className="relative max-w-md">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
          aria-hidden
        />
        <Input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name, email, role or organization"
          aria-label="Search users"
          className="pl-9"
        />
      </div>

      {visibleGroups.length === 0 ? (
        <div className="ops-card p-10 text-center">
          <Users className="mx-auto h-8 w-8 text-slate-300" aria-hidden />
          <p className="mt-3 text-sm font-medium text-slate-900 dark:text-white">
            No accounts match &ldquo;{query.trim()}&rdquo;
          </p>
          <p className="mt-1 text-sm text-slate-500">
            Try part of a name or email address, a role such as &ldquo;Client Admin&rdquo;, or an
            organization name.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {visibleGroups.map((group) => {
            const isOpen = normalizedQuery ? true : !collapsed.has(group.id);
            return (
              <UserGroupCard
                key={group.id}
                group={group}
                isOpen={isOpen}
                onToggle={() => toggle(group.id)}
                clients={clients}
                projects={projects}
                canAssignRoles={canAssignRoles}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

function UserGroupCard({
  group,
  isOpen,
  onToggle,
  clients,
  projects,
  canAssignRoles,
}: {
  group: UserGroup;
  isOpen: boolean;
  onToggle: () => void;
  clients: Client[];
  projects: Project[];
  canAssignRoles: boolean;
}) {
  const { icon: Icon, tile } = GROUP_STYLES[group.kind];
  const panelId = `user-group-${group.id}`;
  const showDashboard = group.kind !== "staff";

  const meta = [
    plural(group.users.length, "account"),
    group.users.length > 0 ? `${group.activeCount} active` : null,
    group.dashboardType ? CLIENT_DASHBOARD_TYPE_LABELS[group.dashboardType] : null,
  ].filter(Boolean);

  return (
    <section className="ops-card overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-4">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={isOpen}
          aria-controls={panelId}
          className="flex min-w-0 flex-1 items-center gap-3 rounded-lg text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent"
        >
          <span
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-semibold",
              tile
            )}
          >
            {group.kind === "organization" ? getInitials(group.name) : <Icon className="h-5 w-5" aria-hidden />}
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex flex-wrap items-center gap-2">
              <span className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                {group.name}
              </span>
              {group.isSuspended && <Badge variant="destructive">Suspended</Badge>}
            </span>
            <span className="mt-0.5 block text-xs text-slate-500">{meta.join(" · ")}</span>
          </span>
          <span className="hidden rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 sm:inline dark:bg-slate-800 dark:text-slate-300">
            {group.users.length}
          </span>
          <ChevronDown
            className={cn(
              "h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200",
              isOpen && "rotate-180"
            )}
            aria-hidden
          />
        </button>
        {group.clientId && (
          <Link
            href={`/admin/clients/${group.clientId}`}
            className="hidden shrink-0 items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-900 md:inline-flex dark:hover:bg-slate-800 dark:hover:text-white"
          >
            View organization
            <ExternalLink className="h-3 w-3" aria-hidden />
          </Link>
        )}
      </div>

      {isOpen && (
        <div id={panelId} className="border-t border-slate-100 dark:border-slate-800">
          {group.users.length === 0 ? (
            <p className="px-5 py-6 text-sm text-slate-500">
              No portal accounts yet. Use <strong>Manage</strong> on a user to link them to this
              organization.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-200/80 hover:bg-transparent dark:border-slate-800">
                    {["Name", "Role", ...(showDashboard ? ["Dashboard"] : []), "Last login", "Status", "Joined", ""].map(
                      (label) => (
                        <TableHead
                          key={label || "actions"}
                          className="text-xs font-semibold uppercase tracking-wider text-slate-500"
                        >
                          {label}
                        </TableHead>
                      )
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {group.users.map((user) => (
                    <TableRow key={user.id} className="border-slate-200/80 dark:border-slate-800">
                      <TableCell>
                        <div className="flex min-w-0 items-center gap-3">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                            {getInitials(user.full_name, user.email)}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-slate-900 dark:text-white">
                              {user.full_name || "—"}
                            </p>
                            <p className="truncate text-xs text-slate-500">{user.email || "—"}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.role === "super_admin" ? "default" : "outline"}>
                          {USER_ROLE_LABELS[user.role] ?? user.role}
                        </Badge>
                      </TableCell>
                      {showDashboard && (
                        <TableCell className="text-sm text-slate-700 dark:text-slate-300">
                          {CLIENT_DASHBOARD_TYPE_LABELS[resolveClientDashboardType(user, user.client)]}
                        </TableCell>
                      )}
                      <TableCell>
                        {user.last_sign_in_at ? (
                          <div className="min-w-0">
                            <p className="text-sm text-slate-700 dark:text-slate-300">
                              {formatRelativeTime(user.last_sign_in_at)}
                            </p>
                            <p className="text-xs text-slate-400">{formatDate(user.last_sign_in_at)}</p>
                          </div>
                        ) : (
                          <span className="text-sm text-slate-400">Never</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.is_active ? "outline" : "destructive"}>
                          {user.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm text-slate-700 dark:text-slate-300">
                        {formatDate(user.created_at)}
                      </TableCell>
                      <TableCell className="text-right">
                        <ManageUserDialog
                          user={user}
                          clients={clients}
                          projects={projects}
                          canAssignRoles={canAssignRoles}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
