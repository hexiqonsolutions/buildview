"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { updateIssueStatus } from "@/lib/actions/issues";
import {
  ISSUE_STATUS_LABELS,
  type IssueStatus,
} from "@/lib/types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface UpdateIssueStatusSelectProps {
  issueId: string;
  currentStatus: IssueStatus;
}

export function UpdateIssueStatusSelect({
  issueId,
  currentStatus,
}: UpdateIssueStatusSelectProps) {
  const [status, setStatus] = useState(currentStatus);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleChange(next: IssueStatus) {
    setStatus(next);
    setError(null);

    startTransition(async () => {
      try {
        await updateIssueStatus(issueId, next);
      } catch (err) {
        setStatus(currentStatus);
        setError(err instanceof Error ? err.message : "Failed to update status");
      }
    });
  }

  return (
    <div className="flex items-center gap-2">
      <Select value={status} onValueChange={(v) => handleChange(v as IssueStatus)}>
        <SelectTrigger className="h-8 w-36 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {(Object.keys(ISSUE_STATUS_LABELS) as IssueStatus[]).map((value) => (
            <SelectItem key={value} value={value}>
              {ISSUE_STATUS_LABELS[value]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {isPending && <Loader2 className="h-4 w-4 animate-spin text-slate-400" />}
      {error && <span className="text-xs text-red-500">{error}</span>}
    </div>
  );
}
