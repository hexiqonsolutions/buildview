"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import {
  Building2,
  Search,
  MoreHorizontal,
  FolderKanban,
  LogIn,
  Ban,
  Trash2,
} from "lucide-react";
import { CreateClientForm } from "@/components/admin/create-client-form";
import { loginAsClientUser } from "@/lib/actions/impersonate";
import { softDeleteClient, updateClientRecord } from "@/lib/actions/admin";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatRelativeTime } from "@/lib/utils";
import type { Client } from "@/lib/types";

export type ClientManagerRow = Client & {
  projectCount: number;
  userCount: number;
  storageBytes: number;
  lastLoginAt: string | null;
  primaryUserId: string | null;
};

function formatStorage(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1_048_576) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1_073_741_824) return `${(bytes / 1_048_576).toFixed(1)} MB`;
  return `${(bytes / 1_073_741_824).toFixed(2)} GB`;
}

function ClientRowActions({ client }: { client: ClientManagerRow }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function toggleSuspend() {
    setError(null);
    startTransition(async () => {
      try {
        await updateClientRecord({
          id: client.id,
          name: client.name,
          company_name: client.company_name,
          email: client.email,
          phone: client.phone,
          address: client.address,
          subscription_status: client.subscription_status,
          is_active: !client.is_active,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to update client");
      }
    });
  }

  function handleLoginAs() {
    if (!client.primaryUserId) return;
    setError(null);
    startTransition(async () => {
      try {
        await loginAsClientUser(client.primaryUserId!);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to login as client");
      }
    });
  }

  function handleDelete() {
    const label = client.company_name || client.name;
    const confirmed = window.confirm(
      `Delete client "${label}"?\n\nThis also removes their projects from active lists. You can recreate clients later for testing.`
    );
    if (!confirmed) return;

    setError(null);
    startTransition(async () => {
      try {
        await softDeleteClient(client.id);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to delete client");
      }
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8" disabled={isPending}>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem asChild>
            <Link href={`/admin/clients/${client.id}`}>Open Workspace</Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href={`/admin/clients/${client.id}?tab=projects`}>
              <FolderKanban className="mr-2 h-4 w-4" />
              Manage Projects
            </Link>
          </DropdownMenuItem>
          {client.primaryUserId && (
            <DropdownMenuItem onClick={handleLoginAs} disabled={isPending}>
              <LogIn className="mr-2 h-4 w-4" />
              Login As Client
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={toggleSuspend} disabled={isPending}>
            <Ban className="mr-2 h-4 w-4" />
            {client.is_active ? "Suspend" : "Reactivate"}
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={handleDelete}
            disabled={isPending}
            className="text-red-600 focus:text-red-600"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete Client
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {error && <p className="max-w-[10rem] text-right text-[10px] text-red-500">{error}</p>}
    </div>
  );
}

export function ClientManagerTable({ clients }: { clients: ClientManagerRow[] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter((c) => {
      const haystack = [
        c.company_name,
        c.name,
        c.email,
        c.phone,
        c.subscription_status,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [clients, query]);

  if (clients.length === 0) {
    return (
      <div className="ops-card flex flex-col items-center px-6 py-16 text-center">
        <Building2 className="mb-3 h-10 w-10 text-slate-300" />
        <p className="font-medium text-slate-900 dark:text-white">No clients yet</p>
        <p className="mt-1 text-sm text-slate-500">Create your first client organization.</p>
        <div className="mt-4">
          <CreateClientForm />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search company, contact, subscription…"
            className="h-10 pl-9"
          />
        </div>
        <p className="text-sm text-slate-500">
          {filtered.length} of {clients.length} clients
        </p>
      </div>

      <div className="ops-card overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="admin-table-head">Company</TableHead>
                <TableHead className="admin-table-head">Contact</TableHead>
                <TableHead className="admin-table-head">Projects</TableHead>
                <TableHead className="admin-table-head">Users</TableHead>
                <TableHead className="admin-table-head">Storage</TableHead>
                <TableHead className="admin-table-head">Subscription</TableHead>
                <TableHead className="admin-table-head">Last Login</TableHead>
                <TableHead className="admin-table-head">Status</TableHead>
                <TableHead className="admin-table-head text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((client) => (
                <TableRow key={client.id} className="group">
                  <TableCell>
                    <Link
                      href={`/admin/clients/${client.id}`}
                      className="flex items-center gap-3"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-800">
                        {client.logo_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={client.logo_url}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span className="text-sm font-bold text-slate-600">
                            {(client.company_name || client.name).charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-medium text-slate-900 group-hover:text-brand-accent-dark dark:text-white">
                          {client.company_name || client.name}
                        </p>
                        <p className="truncate text-xs text-slate-500">{client.email}</p>
                      </div>
                    </Link>
                  </TableCell>
                  <TableCell>
                    <p className="text-sm text-slate-700 dark:text-slate-300">{client.name}</p>
                    <p className="text-xs text-slate-500">{client.phone || "—"}</p>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{client.projectCount}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{client.userCount}</Badge>
                  </TableCell>
                  <TableCell className="text-sm text-slate-600">
                    {formatStorage(client.storageBytes)}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="capitalize">
                      {client.subscription_status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-slate-500">
                    {client.lastLoginAt ? formatRelativeTime(client.lastLoginAt) : "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={client.is_active ? "outline" : "destructive"}>
                      {client.is_active ? "Active" : "Suspended"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="outline" size="sm" asChild className="hidden lg:inline-flex">
                        <Link href={`/admin/clients/${client.id}`}>Workspace</Link>
                      </Button>
                      <ClientRowActions client={client} />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
