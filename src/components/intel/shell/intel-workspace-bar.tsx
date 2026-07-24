"use client";

import { Building2, Layers, MapPin } from "lucide-react";
import { usePortalWorkspace } from "@/components/portal/workspace/portal-workspace-provider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function WorkspaceSelect({
  label,
  value,
  onChange,
  options,
  disabled,
  icon: Icon,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  disabled?: boolean;
  icon: typeof MapPin;
}) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <Icon className="hidden h-3.5 w-3.5 shrink-0 text-brand-accent-dark sm:block" />
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger className="h-8 min-w-[120px] max-w-[180px] border-slate-200/80 bg-white text-xs shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <SelectValue placeholder={label} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value} className="text-xs">
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

/** Project / building / floor selectors synced to portal URL workspace params. */
export function IntelWorkspaceBar() {
  const {
    hydrated,
    projects,
    scope,
    buildings,
    floors,
    clientName,
    dashboardType,
    setProjectId,
    setBuilding,
    setFloor,
  } = usePortalWorkspace();

  const isPortfolio = dashboardType === "portfolio";

  // Portfolio showcase does not use project/building workspace filters.
  if (!hydrated || projects.length === 0 || isPortfolio) {
    return null;
  }

  const showSpatial = projects.length > 0 && Boolean(scope.projectId);
  const companyLabel = clientName?.trim() || null;

  return (
    <div className="hidden border-b border-slate-200 bg-white px-4 py-2.5 lg:block lg:px-8 dark:border-slate-800 dark:bg-slate-950">
      <div className="flex flex-wrap items-center gap-2">
        <span className="mr-1 hidden text-[11px] font-semibold uppercase tracking-wider text-slate-500 sm:inline">
          Workspace
        </span>
        {companyLabel && (
          <span className="hidden max-w-[160px] truncate rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-900 sm:inline dark:border-slate-700 dark:bg-slate-900 dark:text-white">
            {companyLabel}
          </span>
        )}
        {scope.projectId ? (
          <WorkspaceSelect
            label="Project"
            value={scope.projectId}
            onChange={(id) => setProjectId(id)}
            icon={MapPin}
            options={projects.map((p) => ({ value: p.id, label: p.name }))}
          />
        ) : null}
        {showSpatial && buildings.length > 0 && (
          <WorkspaceSelect
            label="Building"
            value={scope.building}
            onChange={setBuilding}
            icon={Building2}
            options={[
              { value: "all", label: "All buildings" },
              ...buildings.map((b) => ({ value: b, label: b })),
            ]}
          />
        )}
        {showSpatial && scope.building !== "all" && floors.length > 0 && (
          <WorkspaceSelect
            label="Floor"
            value={scope.floor}
            onChange={setFloor}
            icon={Layers}
            options={[
              { value: "all", label: "All floors" },
              ...floors.map((f) => ({ value: f, label: f })),
            ]}
          />
        )}
      </div>
    </div>
  );
}
