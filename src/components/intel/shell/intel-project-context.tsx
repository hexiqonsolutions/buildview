"use client";

import { createContext, useContext, useState, useEffect, type ReactNode } from "react";

export type IntelProjectContextValue = {
  projectId: string;
  projectName: string;
  progress: number;
  latestScanDate?: string | null;
};

type IntelProjectContextState = {
  project: IntelProjectContextValue | null;
  setProject: (value: IntelProjectContextValue | null) => void;
};

const IntelProjectContext = createContext<IntelProjectContextState | null>(null);

export function IntelProjectProvider({ children }: { children: ReactNode }) {
  const [project, setProject] = useState<IntelProjectContextValue | null>(null);
  return (
    <IntelProjectContext.Provider value={{ project, setProject }}>
      {children}
    </IntelProjectContext.Provider>
  );
}

export function useIntelProjectContext() {
  const ctx = useContext(IntelProjectContext);
  if (!ctx) {
    throw new Error("useIntelProjectContext must be used within IntelProjectProvider");
  }
  return ctx;
}

/** Mount on project detail pages to populate the intel context bar. */
export function IntelProjectContextBridge({
  projectId,
  projectName,
  progress,
  latestScanDate,
}: IntelProjectContextValue) {
  const { setProject } = useIntelProjectContext();

  useEffect(() => {
    setProject({ projectId, projectName, progress, latestScanDate });
    return () => setProject(null);
  }, [projectId, projectName, progress, latestScanDate, setProject]);

  return null;
}
