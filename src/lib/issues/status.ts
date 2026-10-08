import type { IssueStatus } from "@/lib/types";

/** Statuses that still need action; "resolved" and "closed" are both done. */
export const OPEN_ISSUE_STATUSES = ["open", "in_progress"] as const satisfies readonly IssueStatus[];

export function isOpenIssueStatus(status: string | null | undefined): boolean {
  return (OPEN_ISSUE_STATUSES as readonly string[]).includes(status ?? "");
}
