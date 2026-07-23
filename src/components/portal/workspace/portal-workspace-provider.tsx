"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { Project } from "@/lib/types";
import {
  mergeWorkspaceIntoSearchParams,
  parseWorkspaceScope,
  workspaceScopesEqual,
} from "@/lib/admin/scope";
import {
  normalizeWorkspaceScope,
  spatialRefsForScope,
} from "@/lib/admin/workspace-scope";
import {
  DEFAULT_WORKSPACE,
  type WorkspaceScope,
} from "@/lib/admin/workspace";
import {
  PORTAL_WORKSPACE_STORAGE_KEY,
  portalToAdminBootstrap,
  type PortalWorkspaceBootstrap,
} from "@/lib/portal/workspace";

type PortalWorkspaceContextValue = {
  hydrated: boolean;
  scope: WorkspaceScope;
  projects: Project[];
  project: Project | null;
  clientName: string | null;
  clientLogoUrl: string | null;
  dashboardType: import("@/lib/portal/dashboard-type").ClientDashboardType;
  buildings: string[];
  floors: string[];
  setProjectId: (id: string | null) => void;
  setBuilding: (building: string) => void;
  setFloor: (floor: string) => void;
  resetScope: () => void;
};

const PortalWorkspaceContext = createContext<PortalWorkspaceContextValue | null>(null);

function readStoredScope(): WorkspaceScope {
  if (typeof window === "undefined") return DEFAULT_WORKSPACE;
  try {
    const raw = localStorage.getItem(PORTAL_WORKSPACE_STORAGE_KEY);
    if (!raw) return DEFAULT_WORKSPACE;
    return { ...DEFAULT_WORKSPACE, ...JSON.parse(raw) } as WorkspaceScope;
  } catch {
    return DEFAULT_WORKSPACE;
  }
}

function resolveScope(
  bootstrap: PortalWorkspaceBootstrap,
  preferred: WorkspaceScope
): WorkspaceScope {
  const adminBootstrap = portalToAdminBootstrap(bootstrap);
  const projectId =
    preferred.projectId && bootstrap.projects.some((p) => p.id === preferred.projectId)
      ? preferred.projectId
      : bootstrap.projects[0]?.id ?? null;

  return normalizeWorkspaceScope(adminBootstrap, {
    clientId: bootstrap.clientId,
    projectId,
    building: preferred.building || "all",
    floor: preferred.floor || "all",
    buildingId: preferred.buildingId ?? null,
    floorId: preferred.floorId ?? null,
  });
}

export function PortalWorkspaceProvider({
  bootstrap,
  children,
}: {
  bootstrap: PortalWorkspaceBootstrap;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [hydrated, setHydrated] = useState(false);
  const [scope, setScope] = useState<WorkspaceScope>(DEFAULT_WORKSPACE);
  const skipUrlSync = useRef(false);
  const bootstrapRef = useRef(bootstrap);
  bootstrapRef.current = bootstrap;

  // Stabilize bootstrap identity so RSC re-fetches with equal data don't re-hydrate.
  const bootstrapKey = useMemo(
    () =>
      JSON.stringify({
        clientId: bootstrap.clientId,
        dashboardType: bootstrap.dashboardType,
        projectIds: bootstrap.projects.map((p) => p.id),
        buildingsByProject: bootstrap.buildingsByProject,
        floorsByProject: bootstrap.floorsByProject,
        buildingIdsByProject: bootstrap.buildingIdsByProject,
        floorIdsByProject: bootstrap.floorIdsByProject,
      }),
    [bootstrap]
  );

  const searchKey = searchParams.toString();

  useEffect(() => {
    const fromUrl = parseWorkspaceScope(searchParams);
    const hasUrlScope = Boolean(
      fromUrl.projectId ||
        fromUrl.buildingId ||
        fromUrl.floorId ||
        fromUrl.building !== "all" ||
        fromUrl.floor !== "all"
    );
    const stored = readStoredScope();
    const preferred = hasUrlScope ? fromUrl : stored;
    const next = resolveScope(bootstrapRef.current, preferred);
    setScope((prev) => (workspaceScopesEqual(prev, next) ? prev : next));
    setHydrated(true);
    // searchParams object identity changes often; searchKey is the stable signal.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: searchKey + bootstrapKey
  }, [bootstrapKey, searchKey]);

  const syncScopeToUrl = useCallback(
    (next: WorkspaceScope) => {
      if (!hydrated || skipUrlSync.current) return;
      if (pathname.includes("matterport-comparison")) return;
      const qs = mergeWorkspaceIntoSearchParams(searchParams, next, "portal");
      if (qs === null) return;
      router.replace(`${pathname}${qs}`, { scroll: false });
    },
    [hydrated, pathname, router, searchParams]
  );

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(PORTAL_WORKSPACE_STORAGE_KEY, JSON.stringify(scope));
    syncScopeToUrl(scope);
  }, [scope, hydrated, syncScopeToUrl]);

  const applyScope = useCallback(
    (updater: (prev: WorkspaceScope) => WorkspaceScope) => {
      setScope((prev) => {
        const next = resolveScope(bootstrapRef.current, updater(prev));
        return workspaceScopesEqual(prev, next) ? prev : next;
      });
    },
    []
  );

  const adminBootstrap = useMemo(() => portalToAdminBootstrap(bootstrap), [bootstrap]);

  const project = useMemo(
    () => bootstrap.projects.find((p) => p.id === scope.projectId) ?? null,
    [bootstrap.projects, scope.projectId]
  );

  const buildings = useMemo(() => {
    if (!scope.projectId) return [];
    return bootstrap.buildingsByProject[scope.projectId] ?? [];
  }, [bootstrap.buildingsByProject, scope.projectId]);

  const floors = useMemo(() => {
    if (!scope.projectId) return [];
    const map = bootstrap.floorsByProject[scope.projectId] ?? {};
    if (scope.building === "all") {
      return Array.from(new Set(Object.values(map).flat())).sort();
    }
    return map[scope.building] ?? [];
  }, [bootstrap.floorsByProject, scope.projectId, scope.building]);

  const setProjectId = useCallback(
    (projectId: string | null) => {
      applyScope((prev) => ({
        ...prev,
        projectId,
        building: "all",
        floor: "all",
        buildingId: null,
        floorId: null,
      }));
    },
    [applyScope]
  );

  const setBuilding = useCallback(
    (building: string) => {
      applyScope((prev) => {
        const refs = spatialRefsForScope(adminBootstrap, prev.projectId, building, "all");
        return {
          ...prev,
          building,
          floor: "all",
          buildingId: refs.buildingId,
          floorId: null,
        };
      });
    },
    [applyScope, adminBootstrap]
  );

  const setFloor = useCallback(
    (floor: string) => {
      applyScope((prev) => {
        const refs = spatialRefsForScope(
          adminBootstrap,
          prev.projectId,
          prev.building,
          floor
        );
        return {
          ...prev,
          floor,
          buildingId: refs.buildingId,
          floorId: refs.floorId,
        };
      });
    },
    [applyScope, adminBootstrap]
  );

  const resetScope = useCallback(() => {
    skipUrlSync.current = true;
    setScope(resolveScope(bootstrapRef.current, DEFAULT_WORKSPACE));
    localStorage.removeItem(PORTAL_WORKSPACE_STORAGE_KEY);
    const next = new URLSearchParams(searchParams.toString());
    for (const key of ["client", "project", "building", "floor", "buildingId", "floorId"]) {
      next.delete(key);
    }
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    skipUrlSync.current = false;
  }, [pathname, router, searchParams]);

  const value = useMemo(
    () => ({
      hydrated,
      scope,
      projects: bootstrap.projects,
      project,
      clientName: bootstrap.clientName,
      clientLogoUrl: bootstrap.clientLogoUrl,
      dashboardType: bootstrap.dashboardType,
      buildings,
      floors,
      setProjectId,
      setBuilding,
      setFloor,
      resetScope,
    }),
    [
      hydrated,
      scope,
      bootstrap.projects,
      bootstrap.clientName,
      bootstrap.clientLogoUrl,
      bootstrap.dashboardType,
      project,
      buildings,
      floors,
      setProjectId,
      setBuilding,
      setFloor,
      resetScope,
    ]
  );

  return (
    <PortalWorkspaceContext.Provider value={value}>{children}</PortalWorkspaceContext.Provider>
  );
}

export function usePortalWorkspace() {
  const ctx = useContext(PortalWorkspaceContext);
  if (!ctx) {
    throw new Error("usePortalWorkspace must be used within PortalWorkspaceProvider");
  }
  return ctx;
}

export function useOptionalPortalWorkspace() {
  return useContext(PortalWorkspaceContext);
}
