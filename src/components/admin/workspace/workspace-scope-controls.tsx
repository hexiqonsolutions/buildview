"use client";

import Link from "next/link";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAdminWorkspace } from "@/components/admin/workspace/admin-workspace-provider";

type ScopeOption = { value: string; label: string };

/**
 * Compact client → project → building → floor filters for the admin sidebar.
 * Replaces the old header scope bar; Upload lives under Operations → Upload Center.
 */
export function WorkspaceScopeControls({ className }: { className?: string }) {
  const {
    hydrated,
    clients,
    clientProjects,
    buildings,
    floors,
    scope,
    setClientId,
    setProjectId,
    setBuilding,
    setFloor,
  } = useAdminWorkspace();

  if (!hydrated) {
    return (
      <div className={className}>
        <div className="space-y-2 px-4 py-3 sm:px-5">
          <div className="h-9 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
          <div className="h-9 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
        </div>
      </div>
    );
  }

  const clientOptions: ScopeOption[] = [
    { value: "__all__", label: "All clients" },
    ...clients.map((c) => ({
      value: c.id,
      label: c.company_name || c.name,
    })),
  ];
  const projectOptions: ScopeOption[] = clientProjects.map((p) => ({
    value: p.id,
    label: p.name,
  }));
  const buildingOptions: ScopeOption[] = [
    { value: "all", label: "All buildings" },
    ...buildings.map((b) => ({ value: b, label: b })),
  ];
  const floorOptions: ScopeOption[] = [
    { value: "all", label: "All floors" },
    ...floors.map((f) => ({ value: f, label: f })),
  ];

  const clientValue = scope.clientId ?? "__all__";

  return (
    <div className={className}>
      <div className="space-y-2.5 border-b border-slate-200/80 px-4 py-3 dark:border-slate-800 sm:px-5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
          Workspace
        </p>

        {clients.length === 0 ? (
          <div className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-950">
            <p className="text-xs font-medium text-slate-500">Client</p>
            <Link
              href="/admin/clients"
              className="mt-1 inline-block font-medium text-slate-900 underline-offset-2 hover:underline dark:text-white"
            >
              Add a client first
            </Link>
          </div>
        ) : (
          <StackedSelect
            label="Client"
            value={clientValue}
            onChange={(v) => setClientId(v === "__all__" ? null : v)}
            options={clientOptions}
            placeholder="All clients"
          />
        )}

        <StackedSelect
          label="Project"
          value={scope.projectId ?? ""}
          onChange={(v) => setProjectId(v || null)}
          options={projectOptions}
          placeholder={scope.clientId ? "No projects yet" : "Select client first"}
          disabled={!scope.clientId || projectOptions.length === 0}
        />

        <StackedSelect
          label="Building"
          value={scope.building}
          onChange={setBuilding}
          options={buildingOptions}
          placeholder={!scope.projectId ? "Select project first" : "All buildings"}
          disabled={!scope.projectId}
        />

        <StackedSelect
          label="Floor"
          value={scope.floor}
          onChange={setFloor}
          options={floorOptions}
          placeholder={!scope.projectId ? "Select project first" : "All floors"}
          disabled={!scope.projectId}
        />
      </div>
    </div>
  );
}

function StackedSelect({
  label,
  value,
  onChange,
  options,
  placeholder,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: ScopeOption[];
  placeholder?: string;
  disabled?: boolean;
}) {
  return (
    <div>
      <label className="mb-1 block text-[11px] font-medium text-slate-500">{label}</label>
      <Select
        value={disabled || options.length === 0 ? undefined : value || undefined}
        onValueChange={onChange}
        disabled={disabled || options.length === 0}
      >
        <SelectTrigger className="h-9 border-slate-200 bg-white text-xs dark:border-slate-700 dark:bg-slate-950 disabled:opacity-100">
          <SelectValue placeholder={placeholder ?? label} />
        </SelectTrigger>
        {options.length > 0 && (
          <SelectContent>
            {options.map((o) => (
              <SelectItem key={o.value} value={o.value} className="text-xs">
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        )}
      </Select>
    </div>
  );
}
