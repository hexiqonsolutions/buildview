"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { usePortalWorkspaceQuery } from "@/components/portal/workspace/use-portal-workspace-href";
import { withPortalWorkspaceQuery } from "@/lib/portal/nav";
import { getPortalNavItems } from "@/lib/portal/dashboard-type";
import { usePortalWorkspace } from "@/components/portal/workspace/portal-workspace-provider";
import { globalSearch } from "@/lib/actions/search";

export function IntelCommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const workspaceQuery = usePortalWorkspaceQuery();
  const { dashboardType } = usePortalWorkspace();
  const routes = useMemo(() => getPortalNavItems(dashboardType), [dashboardType]);
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

  const navigate = useCallback(
    (href: string) => {
      router.push(withPortalWorkspaceQuery(href, workspaceQuery));
      onOpenChange(false);
    },
    [router, onOpenChange, workspaceQuery]
  );

  const hasEntityResults =
    entityResults &&
    (entityResults.projects.length > 0 ||
      entityResults.issues.length > 0 ||
      entityResults.documents.length > 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent hideCloseButton className="gap-0 overflow-hidden p-0 sm:max-w-lg">
        <DialogHeader className="border-b border-slate-100 px-3 py-3 dark:border-slate-800 sm:px-4">
          <DialogTitle className="sr-only">Search portal</DialogTitle>
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 shrink-0 text-slate-400" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={dashboardType === "portfolio" ? "Search projects and documents…" : "Search projects, issues, documents…"}
              className="min-w-0 flex-1 border-0 shadow-none focus-visible:ring-0"
              autoFocus
            />
            <DialogClose className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white">
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </DialogClose>
          </div>
        </DialogHeader>

        <div className="max-h-[60vh] overflow-y-auto p-2">
          {searching && <p className="px-3 py-2 text-xs text-slate-400">Searching…</p>}

          {q.length < 2 && !searching && (
            <p className="px-3 py-8 text-center text-sm text-slate-500">
              Type at least 2 characters to search.
            </p>
          )}

          {filteredRoutes.length > 0 && (
            <section className="mb-2">
              <p className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Pages
              </p>
              {filteredRoutes.map((route) => (
                <button
                  key={route.href}
                  type="button"
                  onClick={() => navigate(route.href)}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <route.icon className="h-4 w-4 text-slate-400" />
                  {route.label}
                </button>
              ))}
            </section>
          )}

          {hasEntityResults && (
            <section>
              <p className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Results
              </p>
              {entityResults!.projects.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => navigate(p.href)}
                  className="flex w-full flex-col rounded-lg px-3 py-2 text-left hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <span className="text-sm font-medium">{p.name}</span>
                  <span className="text-xs text-slate-500">{p.client_name}</span>
                </button>
              ))}
              {entityResults!.issues.map((i) => (
                <button
                  key={i.id}
                  type="button"
                  onClick={() => navigate(i.href)}
                  className="flex w-full flex-col rounded-lg px-3 py-2 text-left hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <span className="text-sm font-medium">{i.title}</span>
                  <span className="text-xs text-slate-500">{i.project_name}</span>
                </button>
              ))}
              {entityResults!.documents.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => navigate(d.href)}
                  className="flex w-full flex-col rounded-lg px-3 py-2 text-left hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <span className="text-sm font-medium">{d.name}</span>
                  <span className="text-xs text-slate-500">{d.project_name}</span>
                </button>
              ))}
            </section>
          )}

          {!searching && query.length >= 2 && !hasEntityResults && filteredRoutes.length === 0 && (
            <p className="px-3 py-6 text-center text-sm text-slate-500">No results found.</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
