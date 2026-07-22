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
import { parseWorkspaceScope, scopeToQueryString } from "@/lib/admin/scope";
import {
  normalizeWorkspaceScope,
  spatialRefsForScope,
} from "@/lib/admin/workspace-scope";
import {
  DEFAULT_WORKSPACE,
  WORKSPACE_STORAGE_KEY,
  type AdminWorkspaceBootstrap,
  type AdminWorkspaceClient,
  type WorkspaceScope,
} from "@/lib/admin/workspace";

type AdminWorkspaceContextValue = {
  hydrated: boolean;
  scope: WorkspaceScope;
  clients: AdminWorkspaceClient[];
  projects: Project[];
  client: AdminWorkspaceClient | null;
  project: Project | null;
  clientProjects: Project[];
  buildings: string[];
  floors: string[];
  setClientId: (id: string | null) => void;
  setProjectId: (id: string | null) => void;
  setBuilding: (building: string) => void;
  setFloor: (floor: string) => void;
  resetScope: () => void;
};

const AdminWorkspaceContext = createContext<AdminWorkspaceContextValue | null>(null);

function readStoredScope(): WorkspaceScope {
  if (typeof window === "undefined") return DEFAULT_WORKSPACE;
  try {
    const raw = localStorage.getItem(WORKSPACE_STORAGE_KEY);
    if (!raw) return DEFAULT_WORKSPACE;
    return { ...DEFAULT_WORKSPACE, ...JSON.parse(raw) } as WorkspaceScope;
  } catch {
    return DEFAULT_WORKSPACE;
  }
}

function resolveScope(
  bootstrap: AdminWorkspaceBootstrap,
  preferred: WorkspaceScope
): WorkspaceScope {
  const firstClient = bootstrap.clients[0]?.id ?? null;
  const clientId =
    preferred.clientId && bootstrap.clients.some((c) => c.id === preferred.clientId)
      ? preferred.clientId
      : firstClient;
  const clientProjects = bootstrap.projects.filter((p) => p.client_id === clientId);
  const projectId =
    preferred.projectId && clientProjects.some((p) => p.id === preferred.projectId)
      ? preferred.projectId
      : clientProjects[0]?.id ?? null;

  return normalizeWorkspaceScope(bootstrap, {
    clientId,
    projectId,
    building: preferred.building || "all",
    floor: preferred.floor || "all",
    buildingId: preferred.buildingId ?? null,
    floorId: preferred.floorId ?? null,
  });
}

export function AdminWorkspaceProvider({
  bootstrap,
  children,
}: {
  bootstrap: AdminWorkspaceBootstrap;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [hydrated, setHydrated] = useState(false);
  const [scope, setScope] = useState<WorkspaceScope>(DEFAULT_WORKSPACE);
  const skipUrlSync = useRef(false);

  useEffect(() => {
    const fromUrl = parseWorkspaceScope(searchParams);
    const hasUrlScope = Boolean(
      fromUrl.clientId ||
        fromUrl.projectId ||
        fromUrl.buildingId ||
        fromUrl.floorId ||
        fromUrl.building !== "all" ||
        fromUrl.floor !== "all"
    );
    const stored = readStoredScope();
    const preferred = hasUrlScope ? fromUrl : stored;
    setScope(resolveScope(bootstrap, preferred));
    setHydrated(true);
  }, [bootstrap, searchParams]);

  const syncScopeToUrl = useCallback(
    (next: WorkspaceScope) => {
      if (!hydrated || skipUrlSync.current) return;
      if (pathname.includes("/compare")) return;
      const qs = scopeToQueryString(next);
      router.replace(`${pathname}${qs}`, { scroll: false });
    },
    [hydrated, pathname, router]
  );

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(WORKSPACE_STORAGE_KEY, JSON.stringify(scope));
    syncScopeToUrl(scope);
  }, [scope, hydrated, syncScopeToUrl]);

  const applyScope = useCallback(
    (updater: (prev: WorkspaceScope) => WorkspaceScope) => {
      setScope((prev) => resolveScope(bootstrap, updater(prev)));
    },
    [bootstrap]
  );

  const client = useMemo(
    () => bootstrap.clients.find((c) => c.id === scope.clientId) ?? null,
    [bootstrap.clients, scope.clientId]
  );

  const clientProjects = useMemo(
    () =>
      scope.clientId
        ? bootstrap.projects.filter((p) => p.client_id === scope.clientId)
        : bootstrap.projects,
    [bootstrap.projects, scope.clientId]
  );

  const project = useMemo(
    () => clientProjects.find((p) => p.id === scope.projectId) ?? null,
    [clientProjects, scope.projectId]
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

  const setClientId = useCallback(
    (clientId: string | null) => {
      const nextProjects = clientId
        ? bootstrap.projects.filter((p) => p.client_id === clientId)
        : bootstrap.projects;
      applyScope(() => ({
        clientId,
        projectId: nextProjects[0]?.id ?? null,
        building: "all",
        floor: "all",
        buildingId: null,
        floorId: null,
      }));
    },
    [applyScope, bootstrap.projects]
  );

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
        const refs = spatialRefsForScope(bootstrap, prev.projectId, building, "all");
        return {
          ...prev,
          building,
          floor: "all",
          buildingId: refs.buildingId,
          floorId: null,
        };
      });
    },
    [applyScope, bootstrap]
  );

  const setFloor = useCallback(
    (floor: string) => {
      applyScope((prev) => {
        const refs = spatialRefsForScope(
          bootstrap,
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
    [applyScope, bootstrap]
  );

  const resetScope = useCallback(() => {
    setScope(resolveScope(bootstrap, DEFAULT_WORKSPACE));
  }, [bootstrap]);

  const value = useMemo<AdminWorkspaceContextValue>(
    () => ({
      hydrated,
      scope,
      clients: bootstrap.clients,
      projects: bootstrap.projects,
      client,
      project,
      clientProjects,
      buildings,
      floors,
      setClientId,
      setProjectId,
      setBuilding,
      setFloor,
      resetScope,
    }),
    [
      hydrated,
      scope,
      bootstrap.clients,
      bootstrap.projects,
      client,
      project,
      clientProjects,
      buildings,
      floors,
      setClientId,
      setProjectId,
      setBuilding,
      setFloor,
      resetScope,
    ]
  );

  return (
    <AdminWorkspaceContext.Provider value={value}>{children}</AdminWorkspaceContext.Provider>
  );
}

export function useAdminWorkspace() {
  const ctx = useContext(AdminWorkspaceContext);
  if (!ctx) {
    throw new Error("useAdminWorkspace must be used within AdminWorkspaceProvider");
  }
  return ctx;
}

export function useOptionalAdminWorkspace() {
  return useContext(AdminWorkspaceContext);
}
