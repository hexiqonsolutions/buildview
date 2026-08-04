"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  RotateCcw,
  Download,
  Save,
  Loader2,
  Camera,
  Columns2,
  History,
  CalendarRange,
  Trash2,
  List,
  Calendar,
  Building2,
  Layers,
} from "lucide-react";
import { fetchComparisonSnapshot, saveComparison, deleteSavedComparison } from "@/lib/actions/comparison";
import type { ComparisonProjectsData, ComparisonSnapshot, SavedComparison } from "@/lib/comparison/types";
import { buildShellComparisonSnapshot, buildBlankComparisonSnapshot, isBlankComparisonSnapshot } from "@/lib/comparison/analytics";
import { SyncedViewerPair } from "@/components/compare/synced-viewer-pair";
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
import { CompareDetailedReportDialog } from "@/components/compare/compare-detailed-report";
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
import { tourMatchesCompareFilters } from "@/lib/comparison/spatial";
import {
  parseCompareUrlParams,
  scopeToCompareQueryString,
} from "@/lib/comparison/url-params";
import { useOptionalAdminWorkspace } from "@/components/admin/workspace/admin-workspace-provider";
import { useOptionalPortalWorkspace } from "@/components/portal/workspace/portal-workspace-provider";
import type { WorkspaceScope } from "@/lib/admin/workspace";
import { formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { formatTourScanLabel } from "@/lib/comparison/metadata";

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

  const { projects, tours: allTours } = initialData;
  const hasTours = allTours.length > 0;

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
  const [pickFor, setPickFor] = useState<"A" | "B">("A");
  const [snapshot, setSnapshot] = useState<ComparisonSnapshot | null>(null);
  const [saveOpen, setSaveOpen] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [manageOpen, setManageOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
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

  useEffect(() => {
    if (!isAdmin && clients.length === 1) {
      setClientId(clients[0].id);
    }
  }, [isAdmin, clients]);

  const syncCompareUrl = useCallback(
    (nextScanA = scanAId, nextScanB = scanBId) => {
      const qs = scopeToCompareQueryString(compareScope, nextScanA, nextScanB, {
        includeClient: isAdmin,
      });
      router.replace(`${pathname}${qs}`, { scroll: false });
    },
    [compareScope, scanAId, scanBId, isAdmin, pathname, router]
  );

  useEffect(() => {
    syncCompareUrl();
  }, [compareScope, scanAId, scanBId, syncCompareUrl]);

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
    setSnapshot(null);
  };

  const handleBuildingChange = (value: string) => {
    setBuilding(value);
    setFloor("all");
    setFloorId(null);
    setScanAId("");
    setScanBId("");
    setSnapshot(null);
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
    setScanAId("");
    setScanBId("");
    setSnapshot(null);
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
    const ids = new Set(projectTours.map((t) => t.id));
    if (scanAId && !ids.has(scanAId)) setScanAId("");
    if (scanBId && !ids.has(scanBId)) setScanBId("");
    if (projectTours.length >= 1 && !scanAId) setScanAId(projectTours[0].id);
    if (projectTours.length >= 2 && !scanBId) {
      const nextB = projectTours.find((t) => t.id !== (scanAId || projectTours[0].id));
      if (nextB) setScanBId(nextB.id);
    }
  }, [projectTours, scanAId, scanBId]);

  const shellSnapshot = useMemo(() => {
    const project =
      projects.find((p) => p.id === projectId) ??
      clientProjects[0] ??
      projects[0] ??
      null;

    if (projectTours.length === 0) {
      return buildBlankComparisonSnapshot(project);
    }

    if (!project) return buildBlankComparisonSnapshot(null);

    const a = projectTours.find((t) => t.id === scanAId) ?? projectTours[0];
    const b =
      projectTours.find((t) => t.id === scanBId && t.id !== a.id) ??
      projectTours.find((t) => t.id !== a.id) ??
      a;
    return buildShellComparisonSnapshot(project, a, b);
  }, [projects, clientProjects, projectId, projectTours, scanAId, scanBId]);

  const displaySnapshot = snapshot ?? shellSnapshot;
  const isBlankUi = isBlankComparisonSnapshot(displaySnapshot);

  const runCompare = useCallback(() => {
    if (!scanAId || !scanBId || scanAId === scanBId) return;
    startTransition(async () => {
      const result = await fetchComparisonSnapshot(scanAId, scanBId);
      setSnapshot(result);
    });
  }, [scanAId, scanBId]);

  // Auto-load full comparison (timeline, docs, etc.) when two scans are selected.
  useEffect(() => {
    if (!scanAId || !scanBId || scanAId === scanBId) return;
    startTransition(async () => {
      const result = await fetchComparisonSnapshot(scanAId, scanBId);
      setSnapshot(result);
    });
  }, [scanAId, scanBId]);

  const resetAll = () => {
    setSnapshot(null);
    setScanAId(projectTours[0]?.id ?? "");
    setScanBId(projectTours[1]?.id ?? projectTours[0]?.id ?? "");
  };

  const handleSave = () => {
    if (!saveName.trim() || !projectId || !scanAId || !scanBId) return;

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
      {!hasTours && (
        <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between dark:border-slate-700 dark:bg-slate-800/40">
          <div className="flex items-start gap-3">
            <Camera className="mt-0.5 h-5 w-5 shrink-0 text-slate-500" />
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">
                No site visits yet
              </p>
              <p className="mt-0.5 text-sm text-slate-500">
                Layout is ready — values will fill in after virtual tour scans are uploaded.
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

      {/* Filter toolbar — scoped rows, actions in header */}
      <div className="compare-card overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              Comparison setup
            </p>
            <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
              Choose project scope, then pick Scan A and Scan B
            </p>
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
                  <SelectTrigger className="h-9 w-[150px] cursor-pointer text-xs">
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
                  className="h-9 cursor-pointer"
                >
                  <List className="mr-1.5 h-4 w-4" />
                  Manage
                </Button>
              </>
            )}
            <Button variant="ghost" size="sm" onClick={resetAll} className="h-9 cursor-pointer">
              <RotateCcw className="mr-1.5 h-4 w-4" />
              Reset
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setReportOpen(true)}
              disabled={isBlankUi || !snapshot}
              className="h-9 cursor-pointer"
            >
              <Download className="mr-1.5 h-4 w-4" />
              Export
            </Button>
            <Button
              size="sm"
              className="h-9 cursor-pointer bg-slate-900 hover:bg-slate-800"
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
              {snapshot ? "Save" : "Compare"}
            </Button>
          </div>
        </div>

        <div className="space-y-5 p-4">
          <div>
            <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
              Scope
            </p>
            <div
              className={cn(
                "grid gap-3",
                isAdmin
                  ? "grid-cols-1 sm:grid-cols-2 xl:grid-cols-4"
                  : "grid-cols-1 sm:grid-cols-3"
              )}
            >
              {isAdmin && (
                <FilterSelect
                  label="Client"
                  value={clientId || "_none"}
                  onChange={(v) => setClientId(v === "_none" ? "" : v)}
                  options={
                    clients.length > 0
                      ? clients.map((c) => ({ value: c.id, label: c.name }))
                      : [{ value: "_none", label: "—" }]
                  }
                />
              )}
              <FilterSelect
                label="Project"
                value={projectId || "_none"}
                onChange={(v) => {
                  if (v === "_none") return;
                  handleProjectChange(v);
                }}
                options={
                  clientProjects.length > 0
                    ? clientProjects.map((p) => ({ value: p.id, label: p.name }))
                    : [{ value: "_none", label: "—" }]
                }
              />
              <FilterSelect
                label="Building"
                value={building}
                onChange={handleBuildingChange}
                options={[
                  { value: "all", label: "All Buildings" },
                  ...buildings.map((b) => ({ value: b, label: b })),
                ]}
              />
              <FilterSelect
                label="Floor"
                value={floor}
                onChange={handleFloorChange}
                options={[
                  { value: "all", label: "All Floors" },
                  ...floors.map((f) => ({ value: f, label: f })),
                ]}
              />
            </div>
          </div>

          <div className="border-t border-slate-100 pt-4 dark:border-slate-800">
            <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
              Scans to compare
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <FilterSelect
                label="Scan A"
                value={scanAId || "_none"}
                onChange={(v) => setScanAId(v === "_none" ? "" : v)}
                options={
                  projectTours.filter((t) => t.id !== scanBId).length > 0
                    ? projectTours
                        .filter((t) => t.id !== scanBId)
                        .map((t) => ({
                          value: t.id,
                          label: formatTourScanLabel(t),
                        }))
                    : [{ value: "_none", label: "No scans for this project" }]
                }
              />
              <FilterSelect
                label="Scan B"
                value={scanBId || "_none"}
                onChange={(v) => setScanBId(v === "_none" ? "" : v)}
                options={
                  projectTours.filter((t) => t.id !== scanAId).length > 0
                    ? projectTours
                        .filter((t) => t.id !== scanAId)
                        .map((t) => ({
                          value: t.id,
                          label: formatTourScanLabel(t),
                        }))
                    : [{ value: "_none", label: "No scans for this project" }]
                }
              />
            </div>
          </div>
        </div>
      </div>

      {/* Project scan library — pick Scan A / B from visible scans */}
      {projectId && (
        <div className="compare-card space-y-3 p-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                Project scans
              </p>
              <h3 className="mt-0.5 font-display text-sm font-semibold text-slate-900 dark:text-white">
                {projectTours.length === 0
                  ? "No scans match these filters"
                  : `All scans (${projectTours.length})`}
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                Choose which scans to compare. Select A or B below, then click a scan.
              </p>
            </div>
            <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 p-1 dark:border-slate-700 dark:bg-slate-800/60">
              <button
                type="button"
                onClick={() => setPickFor("A")}
                className={cn(
                  "cursor-pointer rounded-md px-3 py-1.5 text-xs font-semibold transition-colors",
                  pickFor === "A"
                    ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                    : "text-slate-600 hover:text-slate-900 dark:text-slate-300"
                )}
              >
                Select A
              </button>
              <button
                type="button"
                onClick={() => setPickFor("B")}
                className={cn(
                  "cursor-pointer rounded-md px-3 py-1.5 text-xs font-semibold transition-colors",
                  pickFor === "B"
                    ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                    : "text-slate-600 hover:text-slate-900 dark:text-slate-300"
                )}
              >
                Select B
              </button>
            </div>
          </div>

          {projectTours.length > 0 ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {projectTours.map((tour) => {
                const isA = tour.id === scanAId;
                const isB = tour.id === scanBId;
                return (
                  <button
                    key={tour.id}
                    type="button"
                    onClick={() => {
                      if (pickFor === "A") {
                        if (tour.id === scanBId) setScanBId("");
                        setScanAId(tour.id);
                        setPickFor("B");
                      } else {
                        if (tour.id === scanAId) setScanAId("");
                        setScanBId(tour.id);
                      }
                      setSnapshot(null);
                    }}
                    className={cn(
                      "group overflow-hidden rounded-2xl border bg-white text-left transition-all duration-200",
                      "hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md",
                      "dark:bg-slate-900/60 dark:hover:border-slate-600",
                      "cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400/40",
                      isA || isB
                        ? "border-slate-900 ring-2 ring-slate-900/20 dark:border-white dark:ring-white/20"
                        : "border-slate-200/80 dark:border-slate-800"
                    )}
                  >
                    <div className="relative aspect-[16/10] bg-slate-100 dark:bg-slate-800">
                      {tour.thumbnail_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={tour.thumbnail_url}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center">
                          <Camera className="h-7 w-7 text-slate-300 dark:text-slate-600" />
                        </div>
                      )}
                      <div className="absolute left-2 top-2 flex gap-1">
                        {isA && (
                          <span className="rounded-full bg-slate-900 px-2 py-0.5 text-[10px] font-semibold text-white dark:bg-white dark:text-slate-900">
                            Scan A
                          </span>
                        )}
                        {isB && (
                          <span className="rounded-full bg-slate-700 px-2 py-0.5 text-[10px] font-semibold text-white dark:bg-slate-200 dark:text-slate-900">
                            Scan B
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="space-y-1 p-3">
                      <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                        {tour.name}
                      </p>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-slate-500">
                        {(tour.capture_date || tour.created_at) && (
                          <span className="inline-flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatDate(tour.capture_date ?? tour.created_at)}
                          </span>
                        )}
                        {tour.metadata.building && (
                          <span className="inline-flex items-center gap-1">
                            <Building2 className="h-3 w-3" />
                            {tour.metadata.building}
                          </span>
                        )}
                        {tour.metadata.floor && (
                          <span className="inline-flex items-center gap-1">
                            <Layers className="h-3 w-3" />
                            {tour.metadata.floor}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center dark:border-slate-700">
              <Camera className="mx-auto h-8 w-8 text-slate-300 dark:text-slate-600" />
              <p className="mt-2 text-sm text-slate-500">
                Upload virtual tour scans on this project, or clear building/floor filters.
              </p>
            </div>
          )}
        </div>
      )}

      {isPending && isBlankUi && (
        <div className="flex justify-center py-6">
          <Loader2 className="h-8 w-8 animate-spin text-slate-300" />
        </div>
      )}

      <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-2.5 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-800/40 dark:text-slate-300">
            <CalendarRange className="h-4 w-4 text-slate-400" />
            <span>
              Comparing changes between <strong>{displaySnapshot.dateWindowLabel}</strong>
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
                date={displaySnapshot.scanA.capture_date ?? displaySnapshot.scanA.created_at}
                engineer={displaySnapshot.scanA.metadata.engineer}
                blank={isBlankUi}
              />
              <ScanHeader
                label="Scan B"
                date={displaySnapshot.scanB.capture_date ?? displaySnapshot.scanB.created_at}
                engineer={displaySnapshot.scanB.metadata.engineer}
                blank={isBlankUi}
                className="lg:border-l lg:border-slate-100 dark:lg:border-slate-800"
              />
            </div>

            <SyncedViewerPair
              leftUrl={displaySnapshot.scanA.matterport_url}
              rightUrl={displaySnapshot.scanB.matterport_url}
              leftTitle={displaySnapshot.scanA.name}
              rightTitle={displaySnapshot.scanB.name}
              syncEnabled={!isBlankUi}
              immersive
            />
          </div>

          <CompareKpiRow snapshot={displaySnapshot} blank={isBlankUi} />

          <CompareProgressSummary snapshot={displaySnapshot} />

          {/* Dashboard grid */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            <CompareChangesOverview snapshot={displaySnapshot} />
            <CompareDocumentsMatrix snapshot={displaySnapshot} />
            <CompareIssuesStats snapshot={displaySnapshot} />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <CompareReportsTable snapshot={displaySnapshot} />
            <ComparePhotoCarousel snapshot={displaySnapshot} />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <CompareEngineerNotes snapshot={displaySnapshot} blank={isBlankUi} />
            <CompareActivityFeed snapshot={displaySnapshot} />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <CompareHorizontalTimeline snapshot={displaySnapshot} />
            </div>
            <CompareAiSummary
              snapshot={displaySnapshot}
              onOpenReport={() => setReportOpen(true)}
            />
          </div>
        </div>

      <CompareDetailedReportDialog
        snapshot={displaySnapshot}
        open={reportOpen}
        onOpenChange={setReportOpen}
      />

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
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  const fieldId = `compare-filter-${label.toLowerCase().replace(/\s+/g, "-")}`;

  return (
    <div className="min-w-0 space-y-1.5">
      <label htmlFor={fieldId} className="text-[11px] font-medium text-slate-600 dark:text-slate-400">
        {label}
      </label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger id={fieldId} className="h-10 w-full cursor-pointer text-sm">
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
  blank = false,
  className,
}: {
  label: string;
  date: string;
  engineer: string;
  blank?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("px-4 py-3", className)}>
      <p className="text-xs font-semibold text-slate-900 dark:text-white">
        {label} — {blank || !date ? "—" : formatDate(date)}
      </p>
      <p className="text-[11px] text-slate-500">{blank ? "—" : engineer || "—"}</p>
    </div>
  );
}
