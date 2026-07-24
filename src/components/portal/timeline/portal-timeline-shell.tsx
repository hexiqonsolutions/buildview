"use client";

import { useMemo } from "react";
import { AdminTimelineView } from "@/components/admin/admin-timeline-view";
import { usePortalWorkspace } from "@/components/portal/workspace/portal-workspace-provider";
import type { TimelinePageData } from "@/lib/timeline/page-data";

interface PortalTimelineShellProps {
  data: TimelinePageData;
  isDemo?: boolean;
  initialProjectId?: string;
}

export function PortalTimelineShell({
  data,
  isDemo = false,
  initialProjectId,
}: PortalTimelineShellProps) {
  const { hydrated, scope, setProjectId, setBuilding, setFloor, buildings, floors } =
    usePortalWorkspace();

  const workspaceFilters = useMemo(() => {
    if (!hydrated) return undefined;

    const projectId =
      scope.projectId ?? initialProjectId ?? data.projects[0]?.id ?? "";

    return {
      projectId,
      building: scope.building,
      floor: scope.floor,
      buildingId: scope.buildingId,
      floorId: scope.floorId,
      buildingOptions: buildings,
      floorOptions: floors,
      onProjectChange: (id: string) => setProjectId(id),
      onBuildingChange: setBuilding,
      onFloorChange: setFloor,
    };
  }, [
    hydrated,
    scope.projectId,
    scope.building,
    scope.floor,
    scope.buildingId,
    scope.floorId,
    initialProjectId,
    data.projects,
    buildings,
    floors,
    setProjectId,
    setBuilding,
    setFloor,
  ]);

  return (
    <AdminTimelineView
      data={data}
      mode="client"
      isDemo={isDemo}
      initialProjectId={initialProjectId}
      workspaceFilters={workspaceFilters}
    />
  );
}
