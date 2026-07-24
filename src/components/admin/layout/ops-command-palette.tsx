"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Users,
  FolderKanban,
  Camera,
  FileText,
  FolderOpen,
  ImageIcon,
  Calendar,
  Receipt,
  Search,
  Bell,
  AlertTriangle,
  X,
} from "lucide-react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useAdminWorkspace } from "@/components/admin/workspace/admin-workspace-provider";
import { useAdminWorkspaceQuery } from "@/components/admin/workspace/use-admin-workspace-href";
import { withAdminWorkspaceQuery } from "@/lib/admin/nav";
import { globalSearch } from "@/lib/actions/search";

const routes = [
  { href: "/admin", label: "Operations Dashboard", icon: Search },
  { href: "/admin/clients", label: "Client Manager", icon: Users },
  { href: "/admin/projects", label: "Project Manager", icon: FolderKanban },
  { href: "/admin/upload", label: "Upload Center", icon: FolderOpen },
  { href: "/admin/tours", label: "Matterport Manager", icon: Camera },
  { href: "/admin/timeline", label: "Timeline Manager", icon: Calendar },
  { href: "/admin/reports", label: "Reports Manager", icon: FileText },
  { href: "/admin/documents", label: "Document Manager", icon: FolderOpen },
  { href: "/admin/photos", label: "Site Photos", icon: ImageIcon },
  { href: "/admin/issues", label: "Issue Manager", icon: FileText },
  { href: "/admin/invoices", label: "Invoices", icon: Receipt },
  { href: "/admin/notifications", label: "Notifications", icon: Bell },
  { href: "/admin/users", label: "User Manager", icon: Users },
  { href: "/admin/analytics", label: "Analytics", icon: FileText },
  { href: "/admin/storage", label: "Storage Manager", icon: FolderOpen },
  { href: "/admin/activity", label: "Activity Logs", icon: Calendar },
  { href: "/admin/settings", label: "Settings", icon: Search },
] as const;

export function OpsCommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const { clients, clientProjects, client, project } = useAdminWorkspace();
  const workspaceQuery = useAdminWorkspaceQuery();
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [entityResults, setEntityResults] = useState<Awaited<ReturnType<typeof globalSearch>> | null>(
    null
  );

  useEffect(() => {
    if (!open) {
      setQuery("");
      setEntityResults(null);
    }
  }, [open]);

  useEffect(() => {
    if (query.trim().length < 2) {
      setEntityResults(null);
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setSearching(true);
      try {
        const results = await globalSearch(query);
        if (!cancelled) setEntityResults(results);
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 280);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [query]);

  const q = query.toLowerCase().trim();
  const filteredRoutes =
    q.length >= 2 ? routes.filter((r) => r.label.toLowerCase().includes(q)) : [];
  const filteredClients =
    q.length >= 2
      ? clients.filter(
          (c) => c.name.toLowerCase().includes(q) || c.company_name?.toLowerCase().includes(q)
        )
      : [];
  const filteredProjects =
    q.length >= 2 ? clientProjects.filter((p) => p.name.toLowerCase().includes(q)) : [];

  const navigate = useCallback(
    (href: string) => {
      router.push(withAdminWorkspaceQuery(href, workspaceQuery));
      onOpenChange(false);
    },
    [router, onOpenChange, workspaceQuery]
  );

  const hasEntityResults =
    entityResults &&
    (entityResults.clients.length > 0 ||
      entityResults.projects.length > 0 ||
      entityResults.issues.length > 0 ||
      entityResults.documents.length > 0 ||
      entityResults.invoices.length > 0 ||
      entityResults.users.length > 0);

  const noResults =
    q.length >= 2 &&
    filteredRoutes.length === 0 &&
    filteredClients.length === 0 &&
    filteredProjects.length === 0 &&
    !hasEntityResults &&
    !searching;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent hideCloseButton className="gap-0 overflow-hidden p-0 sm:max-w-lg">
        <DialogHeader className="border-b border-slate-100 px-3 py-3 dark:border-slate-800 sm:px-4">
          <DialogTitle className="sr-only">Command palette</DialogTitle>
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 shrink-0 text-slate-400" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search pages, clients, issues, documents..."
              className="min-w-0 flex-1 border-0 bg-transparent shadow-none focus-visible:ring-0"
              autoFocus
            />
            <DialogClose className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white">
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </DialogClose>
          </div>
        </DialogHeader>
        <div className="max-h-[min(60vh,420px)] overflow-y-auto p-2">
          {client && q.length >= 2 && (
            <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Current: {client.company_name || client.name}
              {project ? ` · ${project.name}` : ""}
            </p>
          )}
          {q.length < 2 && !searching && (
            <p className="px-3 py-8 text-center text-sm text-slate-500">
              Type at least 2 characters to search.
            </p>
          )}
          {filteredRoutes.length > 0 && (
            <Section title="Pages">
              {filteredRoutes.map((r) => (
                <button
                  key={r.href}
                  type="button"
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
                  onClick={() => navigate(r.href)}
                >
                  <r.icon className="h-4 w-4 text-slate-400" />
                  {r.label}
                </button>
              ))}
            </Section>
          )}
          {filteredClients.length > 0 && (
            <Section title="Clients">
              {filteredClients.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
                  onClick={() => navigate(`/admin/clients/${c.id}`)}
                >
                  {c.company_name || c.name}
                </button>
              ))}
            </Section>
          )}
          {filteredProjects.length > 0 && (
            <Section title="Workspace projects">
              {filteredProjects.map((p) => (
                <Link
                  key={p.id}
                  href={`/admin/projects/${p.id}`}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
                  onClick={() => onOpenChange(false)}
                >
                  {p.name}
                </Link>
              ))}
            </Section>
          )}
          {entityResults && entityResults.issues.length > 0 && (
            <Section title="Issues">
              {entityResults.issues.map((i) => (
                <button
                  key={i.id}
                  type="button"
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
                  onClick={() => navigate(i.href)}
                >
                  <AlertTriangle className="h-4 w-4 shrink-0 text-slate-400" />
                  <span className="truncate">{i.title}</span>
                </button>
              ))}
            </Section>
          )}
          {entityResults && entityResults.documents.length > 0 && (
            <Section title="Documents">
              {entityResults.documents.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
                  onClick={() => navigate(d.href)}
                >
                  <FolderOpen className="h-4 w-4 shrink-0 text-slate-400" />
                  <span className="truncate">{d.name}</span>
                </button>
              ))}
            </Section>
          )}
          {entityResults && entityResults.invoices.length > 0 && (
            <Section title="Invoices">
              {entityResults.invoices.map((inv) => (
                <button
                  key={inv.id}
                  type="button"
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
                  onClick={() => navigate(inv.href)}
                >
                  <Receipt className="h-4 w-4 shrink-0 text-slate-400" />
                  {inv.label}
                </button>
              ))}
            </Section>
          )}
          {entityResults && entityResults.users.length > 0 && (
            <Section title="Users">
              {entityResults.users.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
                  onClick={() => navigate(u.href)}
                >
                  <Users className="h-4 w-4 shrink-0 text-slate-400" />
                  <span className="truncate">{u.name}</span>
                </button>
              ))}
            </Section>
          )}
          {searching && (
            <p className="px-3 py-4 text-center text-sm text-slate-400">Searching…</p>
          )}
          {noResults && (
            <p className="px-3 py-8 text-center text-sm text-slate-500">No results</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-2">
      <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
        {title}
      </p>
      {children}
    </div>
  );
}
