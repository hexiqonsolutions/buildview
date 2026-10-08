import type { Client, Project } from "@/lib/types";

export type WorkspaceScope = {
  clientId: string | null;
  projectId: string | null;
  building: string;
  floor: string;
  buildingId: string | null;
  floorId: string | null;
};

export type AdminWorkspaceClient = Pick<
  Client,
  "id" | "name" | "company_name" | "logo_url" | "email" | "phone" | "is_active"
>;

export type AdminWorkspaceBootstrap = {
  clients: AdminWorkspaceClient[];
  projects: Project[];
  buildingsByProject: Record<string, string[]>;
  floorsByProject: Record<string, Record<string, string[]>>;
  buildingIdsByProject: Record<string, Record<string, string>>;
  floorIdsByProject: Record<string, Record<string, Record<string, string>>>;
};

export const WORKSPACE_STORAGE_KEY = "buildview-admin-workspace";

export const DEFAULT_WORKSPACE: WorkspaceScope = {
  clientId: null,
  projectId: null,
  building: "all",
  floor: "all",
  buildingId: null,
  floorId: null,
};

/** Last workspace scope persisted in localStorage; callers still validate it against the bootstrap. */
export function readStoredWorkspaceScope(storageKey: string): WorkspaceScope {
  if (typeof window === "undefined") return DEFAULT_WORKSPACE;
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return DEFAULT_WORKSPACE;
    return { ...DEFAULT_WORKSPACE, ...JSON.parse(raw) } as WorkspaceScope;
  } catch {
    return DEFAULT_WORKSPACE;
  }
}
