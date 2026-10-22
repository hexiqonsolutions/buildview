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
  ArrowLeftRight,
  AlertTriangle,
  Check,
  MapPin,
} from "lucide-react";
import { fetchComparisonSnapshot, saveComparison, deleteSavedComparison } from "@/lib/actions/comparison";
import { getProjectSpatialHierarchy, type SpatialHierarchy } from "@/lib/actions/buildings";
import { getTourDate } from "@/lib/comparison/metadata";
import { isValidMatterportUrl } from "@/lib/matterport";
import type { ComparisonProjectsData, ComparisonSnapshot, EnrichedTour, SavedComparison } from "@/lib/comparison/types";
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
  // Real project hierarchy (buildings → floors) from the database, loaded per project.
  const [hierarchy, setHierarchy] = useState<SpatialHierarchy>({ buildings: [] });
  const [hierarchyLoading, setHierarchyLoading] = useState(false);
  const [hierarchyProjectId, setHierarchyProjectId] = useState<string | null>(null);

  useEffect(() => {
    setSaved(initialSaved);
  }, [initialSaved]);

  const linkedHydrated = linkedWs?.hydrated ?? false;
  const linkedScope = linkedWs?.scope;
  useEffect(() => {
    if (!linkedHydrated || !linkedScope) return;
    if (linkedScope.clientId) setClientId(linkedScope.clientId);
    if (linkedScope.projectId) setProjectId(linkedScope.projectId);
    setBuilding(linkedScope.building);
    setFloor(linkedScope.floor);
    setBuildingId(linkedScope.buildingId);
    setFloorId(linkedScope.floorId);
  }, [linkedHydrated, linkedScope]);

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

  // Load the project's real towers/buildings and floors whenever it changes.
  useEffect(() => {
    if (!projectId) {
      setHierarchy({ buildings: [] });
      setHierarchyProjectId(null);
      return;
    }
    let cancelled = false;
    setHierarchyLoading(true);
    getProjectSpatialHierarchy(projectId)
      .then((result) => {
        if (cancelled) return;
        setHierarchy(result);
        setHierarchyProjectId(projectId);
        setHierarchyLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setHierarchy({ buildings: [] });
        setHierarchyProjectId(projectId);
        setHierarchyLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  const hierarchyReady = hierarchyProjectId === projectId;
  const hierarchyBuildings = useMemo(
    () => (hierarchyReady ? hierarchy.buildings : []),
    [hierarchyReady, hierarchy]
  );
  const selectedBuildingRow = useMemo(() => {
    if (buildingId) return hierarchyBuildings.find((b) => b.id === buildingId) ?? null;
    if (building !== "all") return hierarchyBuildings.find((b) => b.name === building) ?? null;
    return null;
  }, [hierarchyBuildings, buildingId, building]);
  const hierarchyFloors = useMemo(
    () => selectedBuildingRow?.floors ?? [],
    [selectedBuildingRow]
  );
  const selectedFloorRow = useMemo(() => {
    if (floorId) return hierarchyFloors.find((f) => f.id === floorId) ?? null;
    if (floor !== "all") return hierarchyFloors.find((f) => f.name === floor) ?? null;
    return null;
  }, [hierarchyFloors, floorId, floor]);

  // Keep name-based scopes (URL, workspace, saved comparisons) in sync with the
  // real hierarchy rows, and drop selections that no longer exist.
  useEffect(() => {
    if (!hierarchyReady) return;
    if (buildingId) {
      const row = hierarchyBuildings.find((b) => b.id === buildingId);
      if (!row) {
        setBuilding("all");
        setBuildingId(null);
        setFloor("all");
        setFloorId(null);
      } else if (building !== row.name) {
        setBuilding(row.name);
      }
      return;
    }
    if (building !== "all") {
      const row = hierarchyBuildings.find((b) => b.name === building);
      if (row) setBuildingId(row.id);
    }
  }, [hierarchyReady, hierarchyBuildings, buildingId, building]);

  useEffect(() => {
    if (!hierarchyReady || !selectedBuildingRow) return;
    if (floorId) {
      const row = hierarchyFloors.find((f) => f.id === floorId);
      if (!row) {
        setFloor("all");
        setFloorId(null);
      } else if (floor !== row.name) {
        setFloor(row.name);
      }
      return;
    }
    if (floor !== "all") {
      const row = hierarchyFloors.find((f) => f.name === floor);
      if (row) setFloorId(row.id);
    }
  }, [hierarchyReady, selectedBuildingRow, hierarchyFloors, floorId, floor]);

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

  const handleBuildingChange = (id: string) => {
    setFloor("all");
    setFloorId(null);
    setScanAId("");
    setScanBId("");
    setSnapshot(null);
    if (id === "all") {
      setBuilding("all");
      setBuildingId(null);
      return;
    }
    const row = hierarchyBuildings.find((b) => b.id === id);
    setBuilding(row?.name ?? "all");
    setBuildingId(row?.id ?? null);
  };

  const handleFloorChange = (id: string) => {
    setScanAId("");
    setScanBId("");
    setSnapshot(null);
    if (id === "all") {
      setFloor("all");
      setFloorId(null);
      return;
    }
    const row = hierarchyFloors.find((f) => f.id === id);
    setFloor(row?.name ?? "all");
    setFloorId(row?.id ?? null);
  };

  useEffect(() => {
    if (clientProjects.length > 0 && !clientProjects.some((p) => p.id === projectId)) {
      setProjectId(clientProjects[0].id);
    }
  }, [clientProjects, projectId]);

  /** Scans in capture order (capture_date, falling back to created_at as the schema does). */
  const sortedTours = useMemo(
    () =>
      [...projectTours].sort(
        (a, b) => getTourDate(a).getTime() - getTourDate(b).getTime()
      ),
    [projectTours]
  );

  const tourA = useMemo(
    () => sortedTours.find((t) => t.id === scanAId),
    [sortedTours, scanAId]
  );
  const tourB = useMemo(
    () => sortedTours.find((t) => t.id === scanBId),
    [sortedTours, scanBId]
  );

  // Keep selections inside the current scope; default to the most recent
  // chronological pair (preferring scans whose tours are actually playable).
  useEffect(() => {
    const ids = new Set(sortedTours.map((t) => t.id));
    let a = ids.has(scanAId) ? scanAId : "";
    let b = ids.has(scanBId) ? scanBId : "";
    if (a && a === b) b = "";

    if (!a && !b && sortedTours.length >= 2) {
      const ready = sortedTours.filter((t) => isValidMatterportUrl(t.matterport_url ?? ""));
      const pool = ready.length >= 2 ? ready : sortedTours;
      a = pool[pool.length - 2].id;
      b = pool[pool.length - 1].id;
    } else if (!a && b) {
      a = sortedTours.find((t) => t.id !== b)?.id ?? "";
    } else if (a && !b) {
      b = [...sortedTours].reverse().find((t) => t.id !== a)?.id ?? "";
    }

    if (a !== scanAId) setScanAId(a);
    if (b !== scanBId) setScanBId(b);
  }, [sortedTours, scanAId, scanBId]);

  // Scan A is always the earlier visit, Scan B the later one.
  useEffect(() => {
    if (!tourA || !tourB || tourA.id === tourB.id) return;
    if (getTourDate(tourA).getTime() > getTourDate(tourB).getTime()) {
      setScanAId(tourB.id);
      setScanBId(tourA.id);
    }
  }, [tourA, tourB]);

  /** Picking the scan already sitting in the other slot swaps the pair. */
  const selectScan = useCallback(
    (slot: "A" | "B", tourId: string) => {
      setSnapshot(null);
      if (!tourId) {
        if (slot === "A") setScanAId("");
        else setScanBId("");
        return;
      }
      if (slot === "A") {
        if (tourId === scanBId) setScanBId(scanAId);
        setScanAId(tourId);
      } else {
        if (tourId === scanAId) setScanAId(scanBId);
        setScanBId(tourId);
      }
    },
    [scanAId, scanBId]
  );

  const swapScans = useCallback(() => {
    if (!scanAId && !scanBId) return;
    setSnapshot(null);
    setScanAId(scanBId);
    setScanBId(scanAId);
  }, [scanAId, scanBId]);

  const comparisonWarnings = useMemo(() => {
    const warnings: string[] = [];
    if (scanAId && scanAId === scanBId) {
      warnings.push("Scan A and Scan B are the same visit. Pick two different scans to compare.");
    }
    if (projectId && sortedTours.length === 1) {
      warnings.push(
        "Only one scan is available for this scope. Upload a second site visit to run a comparison."
      );
    }
    if (tourA && !isValidMatterportUrl(tourA.matterport_url ?? "")) {
      warnings.push(
        `Scan A “${tourA.name}” has no usable tour yet — it may still be processing. Dates, photos, issues, and reports can still be compared.`
      );
    }
    if (tourB && !isValidMatterportUrl(tourB.matterport_url ?? "")) {
      warnings.push(
        `Scan B “${tourB.name}” has no usable tour yet — it may still be processing. Dates, photos, issues, and reports can still be compared.`
      );
    }
    if (tourA && tourB && tourA.id !== tourB.id) {
      const placeA = tourPlaceLabel(tourA);
      const placeB = tourPlaceLabel(tourB);
      const sameBuilding =
        tourA.metadata.building_id && tourB.metadata.building_id
          ? tourA.metadata.building_id === tourB.metadata.building_id
          : placeA.building === placeB.building;
      const sameFloor =
        tourA.metadata.floor_id && tourB.metadata.floor_id
          ? tourA.metadata.floor_id === tourB.metadata.floor_id
          : placeA.floor === placeB.floor;
      if (!sameBuilding || !sameFloor) {
        warnings.push(
          `These scans cover different locations (${placeA.label} vs ${placeB.label}). Progress panels will fall back to project-wide data — pick scans from the same tower and floor for a precise comparison.`
        );
      }
    }
    return warnings;
  }, [projectId, sortedTours.length, tourA, tourB, scanAId, scanBId]);

  const shellSnapshot = useMemo(() => {
    const project =
      projects.find((p) => p.id === projectId) ??
      clientProjects[0] ??
      projects[0] ??
      null;

    if (sortedTours.length === 0) {
      return buildBlankComparisonSnapshot(project);
    }

    if (!project) return buildBlankComparisonSnapshot(null);

    const a = sortedTours.find((t) => t.id === scanAId) ?? sortedTours[0];
    const b =
      sortedTours.find((t) => t.id === scanBId && t.id !== a.id) ??
      sortedTours.find((t) => t.id !== a.id) ??
      a;
    return buildShellComparisonSnapshot(project, a, b);
  }, [projects, clientProjects, projectId, sortedTours, scanAId, scanBId]);

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
    const ready = sortedTours.filter((t) => isValidMatterportUrl(t.matterport_url ?? ""));
    const pool = ready.length >= 2 ? ready : sortedTours;
    setScanAId(pool[pool.length - 2]?.id ?? "");
    setScanBId(pool[pool.length - 1]?.id ?? "");
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

  const selectedProject = projects.find((p) => p.id === projectId) ?? null;
  const setupSteps = [
    {
      label: "Project",
      done: Boolean(projectId),
      active: !projectId,
      hint: selectedProject ? selectedProject.name : "Choose a project",
    },
    {
      label: "Tower",
      done:
        Boolean(projectId) &&
        (selectedBuildingRow != null ||
          (hierarchyReady && hierarchyBuildings.length === 0)),
      active: Boolean(projectId) && !selectedBuildingRow && hierarchyBuildings.length > 0,
      hint:
        hierarchyBuildings.length === 0
          ? hierarchyReady && projectId
            ? "Whole project"
            : "—"
          : (selectedBuildingRow?.name ?? "All towers"),
    },
    {
      label: "Floor",
      done:
        Boolean(selectedBuildingRow) &&
        (selectedFloorRow != null || hierarchyFloors.length === 0),
      active: Boolean(selectedBuildingRow) && !selectedFloorRow && hierarchyFloors.length > 0,
      hint:
        hierarchyFloors.length === 0
          ? selectedBuildingRow
            ? "All floors"
            : "—"
          : (selectedFloorRow?.name ?? "All floors"),
    },
    {
      label: "Scans",
      done: Boolean(tourA && tourB && tourA.id !== tourB.id),
      active: Boolean(projectId) && !(tourA && tourB),
      hint:
        tourA && tourB
          ? `${formatDate(getTourDate(tourA))} → ${formatDate(getTourDate(tourB))}`
          : sortedTours.length === 0
            ? "No scans"
            : sortedTours.length === 1
              ? "1 scan only"
              : "Pick two visits",
    },
  ];

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

      {projects.length === 0 && (
        <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800/40">
          <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-slate-500" />
          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-white">
              No projects available
            </p>
            <p className="mt-0.5 text-sm text-slate-500">
              You don&apos;t have access to any project yet. Ask your BuildView admin to assign
              you to a project, then come back to compare site visits.
            </p>
          </div>
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

        {/* Setup stepper */}
        <ol className="flex flex-wrap items-center gap-x-1 gap-y-2 border-b border-slate-100 px-4 py-3 dark:border-slate-800">
          {setupSteps.map((step, index) => (
            <li key={step.label} className="flex min-w-0 items-center gap-1">
              <span
                className={cn(
                  "flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold",
                  step.done
                    ? "bg-[#a4cf30] text-slate-900"
                    : step.active
                      ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                      : "bg-slate-100 text-slate-400 dark:bg-slate-800"
                )}
              >
                {step.done ? <Check className="h-3 w-3" /> : index + 1}
              </span>
              <span
                className={cn(
                  "text-xs font-semibold",
                  step.done || step.active
                    ? "text-slate-800 dark:text-slate-100"
                    : "text-slate-400"
                )}
              >
                {step.label}
              </span>
              <span className="hidden max-w-44 truncate text-[11px] text-slate-400 xl:inline">
                {step.hint}
              </span>
              {index < setupSteps.length - 1 && (
                <span aria-hidden className="mx-1.5 h-px w-5 shrink-0 bg-slate-200 dark:bg-slate-700 sm:w-8" />
              )}
            </li>
          ))}
          {hierarchyLoading && (
            <li className="ml-auto flex items-center gap-1.5 text-[11px] text-slate-400">
              <Loader2 className="h-3 w-3 animate-spin" />
              Loading towers & floors…
            </li>
          )}
        </ol>

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
                helper={
                  selectedProject
                    ? [selectedProject.client_name, selectedProject.location]
                        .filter(Boolean)
                        .join(" · ") || undefined
                    : projects.length === 0
                      ? "No projects available to you"
                      : "Only projects you can access are listed"
                }
              />
              <FilterSelect
                label="Tower / Building"
                value={selectedBuildingRow?.id ?? "all"}
                onChange={handleBuildingChange}
                disabled={!projectId || hierarchyLoading || hierarchyBuildings.length === 0}
                options={[
                  {
                    value: "all",
                    label:
                      hierarchyBuildings.length === 0
                        ? "Whole project (no towers)"
                        : "All towers",
                  },
                  ...hierarchyBuildings.map((b) => ({ value: b.id, label: b.name })),
                ]}
                helper={
                  !projectId
                    ? "Select a project first"
                    : hierarchyLoading
                      ? "Loading towers…"
                      : hierarchyBuildings.length === 0
                        ? "This project has no towers — comparing the whole project"
                        : `${hierarchyBuildings.length} tower${hierarchyBuildings.length === 1 ? "" : "s"} in this project`
                }
              />
              <FilterSelect
                label="Floor"
                value={selectedFloorRow?.id ?? "all"}
                onChange={handleFloorChange}
                disabled={!selectedBuildingRow || hierarchyFloors.length === 0}
                options={[
                  {
                    value: "all",
                    label: !selectedBuildingRow
                      ? "Select a tower first"
                      : hierarchyFloors.length === 0
                        ? "No floors in this tower"
                        : "All floors",
                  },
                  ...hierarchyFloors.map((f) => ({ value: f.id, label: f.name })),
                ]}
                helper={
                  !selectedBuildingRow
                    ? hierarchyBuildings.length === 0
                      ? "No tower structure — scans stay project-wide"
                      : "Select a tower to see its floors"
                    : hierarchyFloors.length === 0
                      ? "This tower has no floors yet"
                      : `${hierarchyFloors.length} floor${hierarchyFloors.length === 1 ? "" : "s"} in ${selectedBuildingRow.name}`
                }
              />
            </div>
          </div>

          <div className="border-t border-slate-100 pt-4 dark:border-slate-800">
            <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                Scans to compare
              </p>
              <p className="text-[11px] text-slate-400">
                Scan A is the earlier visit, Scan B the later one — they swap automatically if
                picked out of order.
              </p>
            </div>
            <div className="relative grid gap-3 lg:grid-cols-2">
              <ScanSlotCard
                slot="A"
                caption="Previous visit"
                tour={tourA}
                tours={sortedTours}
                excludeId={scanBId}
                onSelect={(id) => selectScan("A", id)}
              />
              <button
                type="button"
                onClick={swapScans}
                disabled={!scanAId || !scanBId}
                aria-label="Swap Scan A and Scan B"
                title="Swap A and B"
                className="absolute left-1/2 top-1/2 z-10 hidden h-9 w-9 -translate-x-1/2 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-40 lg:flex dark:border-slate-700 dark:bg-slate-900 dark:hover:text-white"
              >
                <ArrowLeftRight className="h-4 w-4" />
              </button>
              <ScanSlotCard
                slot="B"
                caption="Current visit"
                tour={tourB}
                tours={sortedTours}
                excludeId={scanAId}
                onSelect={(id) => selectScan("B", id)}
              />
            </div>

            {comparisonWarnings.length > 0 && (
              <div className="mt-3 space-y-1.5 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 dark:border-amber-900/50 dark:bg-amber-950/30">
                {comparisonWarnings.map((warning) => (
                  <p
                    key={warning}
                    className="flex items-start gap-2 text-xs leading-relaxed text-amber-800 dark:text-amber-200"
                  >
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <span>{warning}</span>
                  </p>
                ))}
              </div>
            )}
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
                {sortedTours.length === 0
                  ? "No scans match these filters"
                  : `All scans (${sortedTours.length})`}
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                Oldest to newest. Choose A or B below, then click a scan — clicking the scan
                already in the other slot swaps the pair.
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

          {sortedTours.length > 0 ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {sortedTours.map((tour) => {
                const isA = tour.id === scanAId;
                const isB = tour.id === scanBId;
                const ready = isValidMatterportUrl(tour.matterport_url ?? "");
                return (
                  <button
                    key={tour.id}
                    type="button"
                    onClick={() => {
                      selectScan(pickFor, tour.id);
                      if (pickFor === "A") setPickFor("B");
                    }}
                    className={cn(
                      "group overflow-hidden rounded-2xl border bg-white text-left transition-all duration-200",
                      "hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md",
                      "dark:bg-slate-900/60 dark:hover:border-slate-600",
                      "cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-slate-400/40",
                      isA || isB
                        ? "border-slate-900 ring-2 ring-slate-900/20 dark:border-white dark:ring-white/20"
                        : "border-slate-200/80 dark:border-slate-800"
                    )}
                  >
                    <div className="relative aspect-16/10 bg-slate-100 dark:bg-slate-800">
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
                          <span className="rounded-full bg-[#a4cf30] px-2 py-0.5 text-[10px] font-semibold text-slate-900">
                            Scan B
                          </span>
                        )}
                      </div>
                      <span
                        className={cn(
                          "absolute right-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-semibold",
                          ready
                            ? "bg-emerald-500/90 text-white"
                            : "bg-amber-400/90 text-amber-950"
                        )}
                      >
                        {ready ? "Tour ready" : "No tour yet"}
                      </span>
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
                        {tourPlaceLabel(tour).building && (
                          <span className="inline-flex items-center gap-1">
                            <Building2 className="h-3 w-3" />
                            {tourPlaceLabel(tour).building}
                          </span>
                        )}
                        {tourPlaceLabel(tour).floor && (
                          <span className="inline-flex items-center gap-1">
                            <Layers className="h-3 w-3" />
                            {tourPlaceLabel(tour).floor}
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
              <p className="mt-2 text-sm font-medium text-slate-600 dark:text-slate-300">
                No scans for this scope yet
              </p>
              <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
                {selectedFloorRow
                  ? `No site visit has been uploaded for ${selectedBuildingRow?.name} · ${selectedFloorRow.name} yet. Try another floor, or clear the floor filter.`
                  : selectedBuildingRow
                    ? `No site visit has been uploaded for ${selectedBuildingRow.name} yet. Try another tower, or clear the tower filter.`
                    : "Upload virtual tour scans on this project, or clear the tower/floor filters."}
              </p>
              {isAdmin && (
                <Button asChild size="sm" variant="outline" className="mt-4 cursor-pointer">
                  <Link href="/admin/tours">Upload tours</Link>
                </Button>
              )}
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
  helper,
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  helper?: string;
  disabled?: boolean;
}) {
  const fieldId = `compare-filter-${label.toLowerCase().replace(/\s+/g, "-")}`;

  return (
    <div className="min-w-0 space-y-1.5">
      <label htmlFor={fieldId} className="text-[11px] font-medium text-slate-600 dark:text-slate-400">
        {label}
      </label>
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger
          id={fieldId}
          className="h-10 w-full cursor-pointer text-sm disabled:cursor-not-allowed"
        >
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
      {helper && <p className="truncate text-[11px] leading-snug text-slate-400">{helper}</p>}
    </div>
  );
}

/** Real location of a scan, ignoring the legacy "Main Building / All Floors" defaults. */
function tourPlaceLabel(tour: EnrichedTour): {
  building: string | null;
  floor: string | null;
  label: string;
} {
  const building =
    tour.metadata.building && tour.metadata.building !== "Main Building"
      ? tour.metadata.building
      : null;
  const floor =
    tour.metadata.floor && tour.metadata.floor !== "All Floors"
      ? tour.metadata.floor
      : null;
  return {
    building,
    floor,
    label: [building, floor].filter(Boolean).join(" · ") || "Whole project",
  };
}

function ScanSlotCard({
  slot,
  caption,
  tour,
  tours,
  excludeId,
  onSelect,
}: {
  slot: "A" | "B";
  caption: string;
  tour: EnrichedTour | undefined;
  tours: EnrichedTour[];
  excludeId: string;
  onSelect: (tourId: string) => void;
}) {
  const ready = tour ? isValidMatterportUrl(tour.matterport_url ?? "") : false;
  const place = tour ? tourPlaceLabel(tour) : null;
  const options = tours.filter((t) => t.id !== excludeId);

  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border bg-white dark:bg-slate-900/60",
        slot === "A"
          ? "border-slate-200 dark:border-slate-800"
          : "border-[#a4cf30]/50 dark:border-[#a4cf30]/30"
      )}
    >
      <div className="flex items-center gap-3 p-3">
        <div className="relative h-16 w-24 shrink-0 overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-800">
          {tour?.thumbnail_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={tour.thumbnail_url} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center">
              <Camera className="h-5 w-5 text-slate-300 dark:text-slate-600" />
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                slot === "A"
                  ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                  : "bg-[#a4cf30] text-slate-900"
              )}
            >
              Scan {slot}
            </span>
            <span className="text-[11px] font-medium text-slate-400">{caption}</span>
            {tour && (
              <span
                className={cn(
                  "ml-auto rounded-full px-2 py-0.5 text-[10px] font-semibold",
                  ready
                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                    : "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
                )}
              >
                {ready ? "Tour ready" : "No tour yet"}
              </span>
            )}
          </div>
          {tour ? (
            <>
              <p className="mt-1 truncate text-sm font-semibold text-slate-900 dark:text-white">
                {tour.name}
              </p>
              <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-slate-500">
                <span className="inline-flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {formatDate(tour.capture_date ?? tour.created_at)}
                </span>
                {place?.label && place.label !== "Whole project" && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {place.label}
                  </span>
                )}
                {tour.metadata.engineer && (
                  <span className="truncate">{tour.metadata.engineer}</span>
                )}
              </div>
            </>
          ) : (
            <p className="mt-1 text-sm text-slate-500">
              {tours.length === 0
                ? "No scans in this scope yet"
                : "Pick a scan below or from the library"}
            </p>
          )}
        </div>
      </div>
      <div className="border-t border-slate-100 px-3 py-2.5 dark:border-slate-800">
        <Select
          value={tour?.id ?? ""}
          onValueChange={onSelect}
          disabled={options.length === 0}
        >
          <SelectTrigger
            aria-label={`Choose Scan ${slot}`}
            className="h-9 w-full cursor-pointer text-xs disabled:cursor-not-allowed"
          >
            <SelectValue
              placeholder={
                options.length === 0 ? "No scans available" : `Change Scan ${slot}…`
              }
            />
          </SelectTrigger>
          <SelectContent>
            {options.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {formatTourScanLabel(t)}
                {isValidMatterportUrl(t.matterport_url ?? "") ? "" : " · no tour yet"}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
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
