"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { updateProjectStatus } from "@/lib/actions/admin";
import {
  PROJECT_STATUS_LABELS,
  type ProjectStatus,
} from "@/lib/types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

const CLIENT_STATUSES: ProjectStatus[] = [
  "planning",
  "in_progress",
  "on_hold",
  "completed",
];

const STAFF_STATUSES: ProjectStatus[] = [
  ...CLIENT_STATUSES,
  "suspended",
];

function statusTriggerClass(status: ProjectStatus): string {
  const map: Record<ProjectStatus, string> = {
    in_progress:
      "border-emerald-200 bg-emerald-100 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
    on_hold:
      "border-blue-200 bg-blue-100 text-blue-800 dark:border-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
    completed:
      "border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300",
    planning:
      "border-violet-200 bg-violet-100 text-violet-800 dark:border-violet-800 dark:bg-violet-900/30 dark:text-violet-300",
    archived:
      "border-slate-200 bg-slate-100 text-slate-500 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-400",
    suspended:
      "border-amber-200 bg-amber-100 text-amber-800 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  };
  return map[status] ?? "bg-slate-100 text-slate-800";
}

interface UpdateProjectStatusSelectProps {
  projectId: string;
  currentStatus: ProjectStatus;
  /** Staff can also choose Suspended. Defaults to client options. */
  allowStaffStatuses?: boolean;
  className?: string;
  triggerClassName?: string;
}

export function UpdateProjectStatusSelect({
  projectId,
  currentStatus,
  allowStaffStatuses = false,
  className,
  triggerClassName,
}: UpdateProjectStatusSelectProps) {
  const router = useRouter();
  const [status, setStatus] = useState(currentStatus);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setStatus(currentStatus);
  }, [currentStatus]);

  const baseOptions = allowStaffStatuses ? STAFF_STATUSES : CLIENT_STATUSES;
  const options = baseOptions.includes(status)
    ? baseOptions
    : [...baseOptions, status];

  function handleChange(next: string) {
    const nextStatus = next as ProjectStatus;
    setStatus(nextStatus);
    setError(null);

    startTransition(async () => {
      try {
        await updateProjectStatus(projectId, nextStatus);
        router.refresh();
      } catch (err) {
        setStatus(currentStatus);
        setError(err instanceof Error ? err.message : "Failed to update status");
      }
    });
  }

  return (
    <div className={cn("inline-flex flex-col gap-1", className)}>
      <div className="inline-flex items-center gap-1.5">
        <Select
          value={status}
          onValueChange={handleChange}
          disabled={isPending}
        >
          <SelectTrigger
            className={cn(
              "h-8 w-[8.5rem] border font-medium shadow-none focus:ring-1",
              statusTriggerClass(status),
              triggerClassName
            )}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {options.map((value) => (
              <SelectItem key={value} value={value}>
                {PROJECT_STATUS_LABELS[value] ?? value}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-400" />}
      </div>
      {error && <span className="text-[11px] text-red-500">{error}</span>}
    </div>
  );
}
