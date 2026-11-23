"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Building2, HardHat, LayoutGrid, Sofa, type LucideIcon } from "lucide-react";
import type { AdminWorkspaceBootstrap } from "@/lib/admin/workspace";
import {
  CLIENT_DASHBOARD_TYPES,
  CLIENT_DASHBOARD_TYPE_LABELS,
  isClientDashboardType,
  type ClientDashboardType,
} from "@/lib/portal/dashboard-type";
import { cn } from "@/lib/utils";

/**
 * Admin "portal lens": which client portal staff are working in.
 *
 * Every client belongs to exactly one portal, so the admin is organised by it:
 * the sidebar, project table, upload types and dashboard all follow the lens.
 * It is a visible control (top of the sidebar), so remembering it between
 * visits never hides data silently.
 */
export type AdminPortalLens = "all" | ClientDashboardType;

const STORAGE_KEY = "buildview-admin-portal-lens";

export const PORTAL_LENS_SHORT_LABELS: Record<AdminPortalLens, string> = {
  all: "All",
  construction: "Construction",
  portfolio: "Interior",
  property: "Real Estate",
};

export const PORTAL_ICONS: Record<ClientDashboardType, LucideIcon> = {
  construction: HardHat,
  portfolio: Sofa,
  property: Building2,
};

type LensContextValue = {
  lens: AdminPortalLens;
  setLens: (lens: AdminPortalLens) => void;
  /** Portal of a client (defaults to construction, matching the database default). */
  portalOfClient: (clientId: string | null | undefined) => ClientDashboardType;
  portalOfProject: (projectId: string | null | undefined) => ClientDashboardType | null;
  /** True when the item belongs to the current lens (always true for "all"). */
  inLens: (portal: ClientDashboardType | null | undefined) => boolean;
  counts: Record<ClientDashboardType, number>;
};

const LensContext = createContext<LensContextValue | null>(null);

export function AdminPortalLensProvider({
  bootstrap,
  children,
}: {
  bootstrap: AdminWorkspaceBootstrap;
  children: React.ReactNode;
}) {
  const [lens, setLensState] = useState<AdminPortalLens>("all");

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored && (stored === "all" || isClientDashboardType(stored))) setLensState(stored);
    } catch {
      /* storage unavailable */
    }
  }, []);

  const setLens = useCallback((next: AdminPortalLens) => {
    setLensState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* storage unavailable */
    }
  }, []);

  const clientPortal = useMemo(() => {
    const map = new Map<string, ClientDashboardType>();
    for (const client of bootstrap.clients) {
      map.set(
        client.id,
        isClientDashboardType(client.dashboard_type) ? client.dashboard_type : "construction"
      );
    }
    return map;
  }, [bootstrap.clients]);

  const projectClient = useMemo(
    () => new Map(bootstrap.projects.map((p) => [p.id, p.client_id])),
    [bootstrap.projects]
  );

  const value = useMemo<LensContextValue>(() => {
    const portalOfClient = (clientId: string | null | undefined) =>
      (clientId && clientPortal.get(clientId)) || "construction";
    const portalOfProject = (projectId: string | null | undefined) => {
      if (!projectId) return null;
      const clientId = projectClient.get(projectId);
      return clientId ? portalOfClient(clientId) : null;
    };
    const counts = { construction: 0, portfolio: 0, property: 0 } as Record<ClientDashboardType, number>;
    for (const project of bootstrap.projects) counts[portalOfClient(project.client_id)] += 1;
    return {
      lens,
      setLens,
      portalOfClient,
      portalOfProject,
      inLens: (portal) => lens === "all" || portal === lens,
      counts,
    };
  }, [lens, setLens, clientPortal, projectClient, bootstrap.projects]);

  return <LensContext.Provider value={value}>{children}</LensContext.Provider>;
}

export function useAdminPortalLens(): LensContextValue {
  const ctx = useContext(LensContext);
  if (!ctx) throw new Error("useAdminPortalLens must be used inside AdminPortalLensProvider");
  return ctx;
}

/** Same as useAdminPortalLens but null outside the admin shell (shared components). */
export function useOptionalAdminPortalLens(): LensContextValue | null {
  return useContext(LensContext);
}

/** Sidebar switcher: All · Construction · Interior · Real Estate. */
export function PortalLensSwitcher() {
  const { lens, setLens, counts } = useAdminPortalLens();
  const options: AdminPortalLens[] = ["all", ...CLIENT_DASHBOARD_TYPES];

  return (
    <div className="border-b border-slate-200/80 px-3 py-3 dark:border-slate-800">
      <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
        Portal
      </p>
      <div role="radiogroup" aria-label="Client portal" className="grid grid-cols-2 gap-1">
        {options.map((option) => {
          const Icon = option === "all" ? LayoutGrid : PORTAL_ICONS[option];
          const selected = lens === option;
          const count =
            option === "all"
              ? counts.construction + counts.portfolio + counts.property
              : counts[option];
          return (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={selected}
              title={option === "all" ? "All portals" : CLIENT_DASHBOARD_TYPE_LABELS[option]}
              onClick={() => setLens(option)}
              className={cn(
                "flex min-h-10 items-center gap-1.5 rounded-lg px-2 text-left text-xs font-medium transition-colors",
                selected
                  ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                  : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
              )}
            >
              <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
              <span className="min-w-0 flex-1 truncate">{PORTAL_LENS_SHORT_LABELS[option]}</span>
              <span className={cn("tabular-nums", selected ? "opacity-70" : "text-slate-400")}>{count}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
