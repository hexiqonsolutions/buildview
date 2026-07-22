"use client";

import type { ComponentType } from "react";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  RotateCcw,
  Download,
  Save,
  Link2,
  Unlink,
  Loader2,
  Camera,
  Columns2,
  History,
  CalendarRange,
  Trash2,
  List,
} from "lucide-react";
import { fetchComparisonSnapshot, saveComparison, deleteSavedComparison } from "@/lib/actions/comparison";
import type { ComparisonProjectsData, ComparisonSnapshot, SavedComparison } from "@/lib/comparison/types";
import { SyncedViewerPair, SyncStatusBadge } from "@/components/compare/synced-viewer-pair";
import {
  CompareKpiRow,
  CompareProgressSummary,
  CompareChangesOverview,
  CompareDocumentsMatrix,
  CompareIssuesStats,
  CompareReportsTable,
  ComparePhotoCarousel,
  CompareHorizontalTimeline,
  CompareAiSummary,
  CompareActivityFeed,
  CompareEngineerNotes,
} from "@/components/compare/compare-sections";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import Link from "next/link";
import { getDemoComparisonSnapshot, DEMO_PROJECTS_DATA } from "@/lib/comparison/demo-snapshot";
import { tourMatchesCompareFilters } from "@/lib/comparison/spatial";
import {
  parseCompareUrlParams,
  scopeToCompareQueryString,
} from "@/lib/comparison/url-params";
import { useOptionalAdminWorkspace } from "@/components/admin/workspace/admin-workspace-provider";
import { useOptionalPortalWorkspace } from "@/components/portal/workspace/portal-workspace-provider";
import type { WorkspaceScope } from "@/lib/admin/workspace";
import { extractMatterportModelId } from "@/lib/matterport";
import { formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface CompareProgressHubProps {
  initialData: ComparisonProjectsData;
  initialSaved?: SavedComparison[];
  isAdmin?: boolean;
}

export function CompareProgressHub({
  initialData,
  initialSaved = [],
  isAdmin = false,
}: CompareProgressHubProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const adminWs = useOptionalAdminWorkspace();
  const portalWs = useOptionalPortalWorkspace();
  const linkedWs = isAdmin ? adminWs : portalWs;

  const urlParams = useMemo(() => parseCompareUrlParams(searchParams), [searchParams]);

  const hasRealTours = initialData.tours.length > 0;
  const isDemo = !hasRealTours;
  const { projects, tours: allTours } = isDemo ? DEMO_PROJECTS_DATA : initialData;

  const clients = useMemo(() => {
    const map = new Map<string, string>();
    projects.forEach((p) => map.set(p.client_id, p.client_name));
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [projects]);

  const [clientId, setClientId] = useState(
    urlParams.clientId ?? clients[0]?.id ?? ""
  );
  const [projectId, setProjectId] = useState(
    urlParams.projectId ?? projects[0]?.id ?? ""
  );
  const [building, setBuilding] = useState(urlParams.building);
  const [floor, setFloor] = useState(urlParams.floor);
  const [buildingId, setBuildingId] = useState<string | null>(urlParams.buildingId);
  const [floorId, setFloorId] = useState<string | null>(urlParams.floorId);
  const [scanAId, setScanAId] = useState(urlParams.scanAId ?? "");
  const [scanBId, setScanBId] = useState(urlParams.scanBId ?? "");
  const [snapshot, setSnapshot] = useState<ComparisonSnapshot | null>(null);
  const [syncEnabled, setSyncEnabled] = useState(true);
  const [saveOpen, setSaveOpen] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [manageOpen, setManageOpen] = useState(false);
  const [saved, setSaved] = useState<SavedComparison[]>(initialSaved);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setSaved(initialSaved);
  }, [initialSaved]);

  useEffect(() => {
    if (!linkedWs?.hydrated) return;
    const { scope } = linkedWs;
    if (scope.clientId) setClientId(scope.clientId);
    if (scope.projectId) setProjectId(scope.projectId);
    setBuilding(scope.building);
    setFloor(scope.floor);
    setBuildingId(scope.buildingId);
    setFloorId(scope.floorId);
  }, [linkedWs?.hydrated, linkedWs?.scope]);

  const compareScope = useMemo(
    (): WorkspaceScope => ({
      clientId: clientId || null,
      projectId: projectId || null,
      building,
      floor,
      buildingId,
      floorId,
    }),
    [clientId, projectId, building, floor, buildingId, floorId]
  );

  const syncCompareUrl = useCallback(
    (nextScanA = scanAId, nextScanB = scanBId) => {
      if (isDemo) return;
      const qs = scopeToCompareQueryString(compareScope, nextScanA, nextScanB, {
        includeClient: isAdmin,
      });
      router.replace(`${pathname}${qs}`, { scroll: false });
    },
    [compareScope, scanAId, scanBId, isDemo, isAdmin, pathname, router]
  );

  useEffect(() => {
    if (isDemo) return;
    syncCompareUrl();
  }, [compareScope, scanAId, scanBId, isDemo, syncCompareUrl]);

  const clientProjects = useMemo(
    () => projects.filter((p) => !clientId || p.client_id === clientId),
    [projects, clientId]
  );

  const projectTours = useMemo(() => {
    return allTours.filter((t) => {
      if (t.project_id !== projectId) return false;
      return tourMatchesCompareFilters(t, projectId, compareScope);
    });
  }, [allTours, projectId, compareScope]);

  const buildings = useMemo(() => {
    const names = new Set<string>();
    allTours
      .filter((t) => t.project_id === projectId)
      .forEach((t) => {
        if (t.metadata.building) names.add(t.metadata.building);
      });
    return Array.from(names).sort();
  }, [allTours, projectId]);

  const floors = useMemo(() => {
    const names = new Set<string>();
    allTours
      .filter(
        (t) =>
          t.project_id === projectId &&
          (building === "all" || t.metadata.building === building) &&
          (!buildingId || t.metadata.building_id === buildingId)
      )
      .forEach((t) => {
        if (t.metadata.floor) names.add(t.metadata.floor);
      });
    return Array.from(names).sort();
  }, [allTours, projectId, building, buildingId]);

  const handleProjectChange = (id: string) => {
    setProjectId(id);
    setBuilding("all");
    setFloor("all");
    setBuildingId(null);
    setFloorId(null);
    setScanAId("");
    setScanBId("");
  };

  const handleBuildingChange = (value: string) => {
    setBuilding(value);
    setFloor("all");
    setFloorId(null);
    if (value === "all") {
      setBuildingId(null);
    } else {
      const match = allTours.find(
        (t) => t.project_id === projectId && t.metadata.building === value
      );
      setBuildingId(match?.metadata.building_id ?? null);
    }
  };

  const handleFloorChange = (value: string) => {
    setFloor(value);
    if (value === "all") {
      setFloorId(null);
    } else {
      const match = allTours.find(
        (t) =>
          t.project_id === projectId &&
          (building === "all" || t.metadata.building === building) &&
          t.metadata.floor === value
      );
      setFloorId(match?.metadata.floor_id ?? null);
    }
  };

  useEffect(() => {
    if (clientProjects.length > 0 && !clientProjects.some((p) => p.id === projectId)) {
      setProjectId(clientProjects[0].id);
    }
  }, [clientProjects, projectId]);

  useEffect(() => {
    if (projectTours.length >= 1 && !scanAId) setScanAId(projectTours[0].id);
    if (projectTours.length >= 2 && !scanBId) setScanBId(projectTours[1].id);
  }, [projectTours, scanAId, scanBId]);

  const runCompare = useCallback(() => {
    if (!scanAId || !scanBId || scanAId === scanBId) return;
    if (isDemo) {
      setSnapshot(getDemoComparisonSnapshot());
      return;
    }
    startTransition(async () => {
      const result = await fetchComparisonSnapshot(scanAId, scanBId);
      setSnapshot(result);
    });
  }, [scanAId, scanBId, isDemo]);

  useEffect(() => {
    if (isDemo) {
      setSnapshot(getDemoComparisonSnapshot());
      setScanAId(DEMO_PROJECTS_DATA.tours[0]?.id ?? "");
      setScanBId(DEMO_PROJECTS_DATA.tours[1]?.id ?? "");
      setProjectId(DEMO_PROJECTS_DATA.projects[0]?.id ?? "");
      setClientId("demo-client");
      return;
    }
    const a = urlParams.scanAId;
    const b = urlParams.scanBId;
    if (a && b && a !== b) {
      startTransition(async () => {
        const result = await fetchComparisonSnapshot(a, b);
        setSnapshot(result);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDemo]);

  const resetAll = () => {
    setSnapshot(null);
    setScanAId(projectTours[0]?.id ?? "");
    setScanBId(projectTours[1]?.id ?? projectTours[0]?.id ?? "");
  };

  const sameModel =
    snapshot &&
    extractMatterportModelId(snapshot.scanA.matterport_url) ===
      extractMatterportModelId(snapshot.scanB.matterport_url);

  const handleSave = () => {
    if (!saveName.trim() || !projectId || !scanAId || !scanBId || isDemo) return;

    startTransition(async () => {
      const result = await saveComparison({
        name: saveName.trim(),
        projectId,
        tourAId: scanAId,
        tourBId: scanBId,
        building,
        floor,
        buildingId,
        floorId,
        clientId: clientId || null,
      });

      if (!result.success) return;

      setSaved((prev) => [result.item, ...prev]);
      setSaveOpen(false);
      setSaveName("");
    });
  };

  const restoreSaved = (entry: SavedComparison) => {
    setProjectId(entry.projectId);
    setBuilding(entry.building);
    setFloor(entry.floor);
    setBuildingId(entry.buildingId ?? null);
    setFloorId(entry.floorId ?? null);
    setScanAId(entry.tourAId);
    setScanBId(entry.tourBId);
    if (isDemo) {
      setSnapshot(getDemoComparisonSnapshot());
      return;
    }
    startTransition(async () => {
      const result = await fetchComparisonSnapshot(entry.tourAId, entry.tourBId);
      setSnapshot(result);
    });
  };

  const handleDeleteSaved = (id: string) => {
    startTransition(async () => {
      const result = await deleteSavedComparison(id);
      if (!result.success) return;
      setSaved((prev) => prev.filter((s) => s.id !== id));
    });
  };

  return (
    <div className="space-y-6">
      {isDemo && (
        <div className="flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between dark:border-amber-900/50 dark:bg-amber-950/30">
          <div className="flex items-start gap-3">
            <Camera className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
            <div>
              <p className="text-sm font-semibold text-amber-900 dark:text-amber-100">
                Demo preview — no site visits in your account yet
              </p>
              <p className="mt-0.5 text-sm text-amber-800/80 dark:text-amber-200/70">
                This layout uses sample data. Upload Matterport scans in the admin portal to compare real
                project progress.
              </p>
            </div>
          </div>
          {isAdmin && (
            <Button asChild size="sm" className="shrink-0 bg-slate-900 hover:bg-slate-800">
              <Link href="/admin/tours">Upload tours</Link>
            </Button>
          )}
        </div>
      )}

      {/* Filter toolbar */}
      <div className="compare-card p-3">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <FilterSelect
              label="Client"
              value={clientId}
              onChange={setClientId}
              options={clients.map((c) => ({ value: c.id, label: c.name }))}
              width="w-[140px]"
            />
            <FilterSelect
              label="Project"
              value={projectId}
              onChange={handleProjectChange}
              options={clientProjects.map((p) => ({ value: p.id, label: p.name }))}
              width="w-[160px]"
            />
            <FilterSelect
              label="Building"
              value={building}
              onChange={handleBuildingChange}
              options={[
                { value: "all", label: "All Buildings" },
                ...buildings.map((b) => ({ value: b, label: b })),
              ]}
              width="w-[130px]"
            />
            <FilterSelect
              label="Floor"
              value={floor}
              onChange={handleFloorChange}
              options={[
                { value: "all", label: "All Floors" },
                ...floors.map((f) => ({ value: f, label: f })),
              ]}
              width="w-[120px]"
            />
            <FilterSelect
              label="Scan A"
              value={scanAId}
              onChange={setScanAId}
              options={projectTours
                .filter((t) => t.id !== scanBId)
                .map((t) => ({
                  value: t.id,
                  label: formatDate(t.capture_date ?? t.created_at),
                }))}
              width="w-[130px]"
            />
            <FilterSelect
              label="Scan B"
              value={scanBId}
              onChange={setScanBId}
              options={projectTours
                .filter((t) => t.id !== scanAId)
                .map((t) => ({
                  value: t.id,
                  label: formatDate(t.capture_date ?? t.created_at),
                }))}
              width="w-[130px]"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {saved.length > 0 && (
              <>
                <Select
                  onValueChange={(id) => {
                    const entry = saved.find((s) => s.id === id);
                    if (entry) restoreSaved(entry);
                  }}
                >
                  <SelectTrigger className="h-9 w-[150px] text-xs">
                    <SelectValue placeholder="Load saved…" />
                  </SelectTrigger>
                  <SelectContent>
                    {saved.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setManageOpen(true)}
                  className="h-9"
                >
                  <List className="mr-1.5 h-4 w-4" />
                  Manage
                </Button>
              </>
            )}
            <Button variant="ghost" size="sm" onClick={resetAll}>
              <RotateCcw className="mr-1.5 h-4 w-4" />
              Reset
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.print()}
              disabled={!snapshot}
            >
              <Download className="mr-1.5 h-4 w-4" />
              Export Report
            </Button>
            <Button
              size="sm"
              className="bg-slate-900 hover:bg-slate-800"
              onClick={() => (snapshot ? setSaveOpen(true) : runCompare())}
              disabled={isPending || !scanAId || !scanBId || scanAId === scanBId}
            >
              {isPending ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : snapshot ? (
                <Save className="mr-1.5 h-4 w-4" />
              ) : (
                <Columns2 className="mr-1.5 h-4 w-4" />
              )}
              {snapshot ? "Save Comparison" : "Compare"}
            </Button>
          </div>
        </div>
      </div>

      {!snapshot && !isPending && !isDemo && (
        <div className="compare-card flex flex-col items-center py-20 text-center">
          <Columns2 className="mb-4 h-14 w-14 text-slate-200" />
          <p className="font-display text-lg font-semibold text-slate-900 dark:text-white">
            Select two site visits and click Compare
          </p>
          <p className="mt-2 max-w-md text-sm text-slate-500">
            Instantly understand progress, documents, reports, and issues between captures.
          </p>
          <Button className="mt-6 bg-slate-900 hover:bg-slate-800" onClick={runCompare} disabled={!scanAId || !scanBId}>
            Run Comparison
          </Button>
        </div>
      )}

      {isPending && !snapshot && (
        <div className="flex justify-center py-24">
          <Loader2 className="h-10 w-10 animate-spin text-slate-300" />
        </div>
      )}

      {snapshot && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-2.5 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-800/40 dark:text-slate-300">
            <CalendarRange className="h-4 w-4 text-slate-400" />
            <span>
              Comparing changes between <strong>{snapshot.dateWindowLabel}</strong>
            </span>
            {saved.length > 0 && (
              <span className="ml-auto flex items-center gap-1 text-xs text-slate-400">
                <History className="h-3.5 w-3.5" />
                {saved.length} saved comparison{saved.length === 1 ? "" : "s"}
              </span>
            )}
          </div>

          {/* Full-width immersive viewers */}
          <div className="compare-card overflow-hidden">
            <div className="grid grid-cols-1 border-b border-slate-100 dark:border-slate-800 lg:grid-cols-2">
              <ScanHeader
                label="Scan A"
                date={snapshot.scanA.capture_date ?? snapshot.scanA.created_at}
                engineer={snapshot.scanA.metadata.engineer}
              />
              <ScanHeader
                label="Scan B"
                date={snapshot.scanB.capture_date ?? snapshot.scanB.created_at}
                engineer={snapshot.scanB.metadata.engineer}
                className="lg:border-l lg:border-slate-100 dark:lg:border-slate-800"
              />
            </div>

            <ViewerSyncBar
              syncEnabled={syncEnabled}
              onSyncEnabled={() => setSyncEnabled(true)}
              onSyncDisabled={() => setSyncEnabled(false)}
              sameModel={!!sameModel}
            />

            <SyncedViewerPair
              leftUrl={snapshot.scanA.matterport_url}
              rightUrl={snapshot.scanB.matterport_url}
              leftTitle={snapshot.scanA.name}
              rightTitle={snapshot.scanB.name}
              syncEnabled={syncEnabled}
              immersive
            />
          </div>

          <CompareKpiRow snapshot={snapshot} />

          <CompareProgressSummary snapshot={snapshot} />

          {/* Dashboard grid */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            <CompareChangesOverview snapshot={snapshot} />
            <CompareDocumentsMatrix snapshot={snapshot} />
            <CompareIssuesStats snapshot={snapshot} />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <CompareReportsTable snapshot={snapshot} />
            <ComparePhotoCarousel snapshot={snapshot} />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <CompareEngineerNotes snapshot={snapshot} />
            <CompareActivityFeed snapshot={snapshot} />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <CompareHorizontalTimeline snapshot={snapshot} />
            </div>
            <CompareAiSummary snapshot={snapshot} />
          </div>
        </div>
      )}

      <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Comparison</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="e.g. Structure Completion, Monthly Review"
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
            />
            <Button className="w-full bg-slate-900 hover:bg-slate-800" onClick={handleSave} disabled={isPending}>
              Save Comparison
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={manageOpen} onOpenChange={setManageOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Saved Comparisons</DialogTitle>
          </DialogHeader>
          {saved.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-500">No saved comparisons.</p>
          ) : (
            <div className="max-h-80 space-y-2 overflow-y-auto">
              {saved.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center gap-2 rounded-lg border border-slate-100 px-3 py-2.5 dark:border-slate-800"
                >
                  <button
                    type="button"
                    className="min-w-0 flex-1 text-left"
                    onClick={() => {
                      restoreSaved(entry);
                      setManageOpen(false);
                    }}
                  >
                    <p className="truncate text-sm font-medium text-slate-900 dark:text-white">
                      {entry.name}
                    </p>
                    <p className="text-xs text-slate-500">
                      {formatDate(entry.createdAt)}
                      {entry.building !== "all" ? ` · ${entry.building}` : ""}
                      {entry.floor !== "all" ? ` · ${entry.floor}` : ""}
                    </p>
                  </button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="shrink-0 text-red-600 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950/40"
                    disabled={isPending}
                    onClick={() => handleDeleteSaved(entry.id)}
                    aria-label={`Delete ${entry.name}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
  width,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  width: string;
}) {
  return (
    <div className={cn("space-y-0.5", width)}>
      <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400">{label}</p>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-9 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function ScanHeader({
  label,
  date,
  engineer,
  className,
}: {
  label: string;
  date: string;
  engineer: string;
  className?: string;
}) {
  return (
    <div className={cn("px-4 py-3", className)}>
      <p className="text-xs font-semibold text-slate-900 dark:text-white">
        {label} — {formatDate(date)}
      </p>
      <p className="text-[11px] text-slate-500">{engineer}</p>
    </div>
  );
}

function ViewerSyncBar({
  syncEnabled,
  onSyncEnabled,
  onSyncDisabled,
  sameModel,
}: {
  syncEnabled: boolean;
  onSyncEnabled: () => void;
  onSyncDisabled: () => void;
  sameModel: boolean;
}) {
  return (
    <div className="flex flex-col gap-3 border-b border-slate-100 bg-slate-50/90 px-4 py-3 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800 dark:bg-slate-900/60">
      <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
        Side by Side
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <ToolbarPill active={syncEnabled} onClick={onSyncEnabled} icon={Link2} theme="light">
          Sync Cameras
        </ToolbarPill>
        <ToolbarPill active={!syncEnabled} onClick={onSyncDisabled} icon={Unlink} theme="light">
          Unsync
        </ToolbarPill>
        <SyncStatusBadge syncEnabled={syncEnabled} sameModel={sameModel} theme="light" />
      </div>
    </div>
  );
}

function ToolbarPill({
  active,
  onClick,
  icon: Icon,
  children,
  theme = "dark",
}: {
  active?: boolean;
  onClick: () => void;
  icon: ComponentType<{ className?: string }>;
  children: React.ReactNode;
  theme?: "dark" | "light";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
        theme === "light"
          ? active
            ? "bg-slate-900 text-white shadow-sm"
            : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700"
          : active
            ? "bg-white text-slate-900"
            : "text-slate-300 hover:text-white"
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {children}
    </button>
  );
}
