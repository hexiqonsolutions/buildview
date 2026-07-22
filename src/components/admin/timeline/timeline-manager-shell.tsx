"use client";

import { useMemo } from "react";
import { Calendar } from "lucide-react";
import { AdminTimelineView } from "@/components/admin/admin-timeline-view";
import { OpsWorkspacePage } from "@/components/admin/ops/ops-workspace-page";
import { useAdminWorkspace } from "@/components/admin/workspace/admin-workspace-provider";
import type { TimelinePageData } from "@/lib/timeline/page-data";

interface TimelineManagerShellProps {
  data: TimelinePageData;
  initialProjectId?: string;
}

export function TimelineManagerShell({ data, initialProjectId }: TimelineManagerShellProps) {
  const {
    hydrated,
    scope,
    setProjectId,
    setBuilding,
    setFloor,
    buildings,
    floors,
  } = useAdminWorkspace();

  const workspaceFilters = useMemo(() => {
    if (!hydrated) return undefined;

    const projectId =
      scope.projectId ?? initialProjectId ?? data.projects[0]?.id ?? "";

    return {
      projectId,
      building: scope.building,
      floor: scope.floor,
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
    initialProjectId,
    data.projects,
    buildings,
    floors,
    setProjectId,
    setBuilding,
    setFloor,
  ]);

  return (
    <OpsWorkspacePage
      title="Timeline"
      description="Milestones, progress updates, and linked Matterport scans."
      icon={Calendar}
      showBanner={false}
    >
      <AdminTimelineView
        data={data}
        mode="admin"
        initialProjectId={initialProjectId}
        workspaceFilters={workspaceFilters}
      />
    </OpsWorkspacePage>
  );
}
