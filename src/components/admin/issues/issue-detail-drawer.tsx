"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { Loader2, MapPin, User as UserIcon } from "lucide-react";
import { updateIssue } from "@/lib/actions/issues";
import { IssueImageGallery } from "@/components/issues/issue-image-gallery";
import { UpdateIssueStatusSelect } from "@/components/admin/update-issue-status";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ISSUE_PRIORITY_LABELS,
  ISSUE_STATUS_LABELS,
  type IssuePriority,
  type IssueStatus,
  type IssueWithRelations,
  type User,
} from "@/lib/types";
import { formatDate, getStatusColor } from "@/lib/utils";

type IssueRow = IssueWithRelations & { project?: { name: string; id?: string } | null };

interface IssueDetailDrawerProps {
  issue: IssueRow | null;
  users: User[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function IssueDetailDrawer({
  issue,
  users,
  open,
  onOpenChange,
}: IssueDetailDrawerProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<IssuePriority>("medium");
  const [location, setLocation] = useState("");
  const [assignedTo, setAssignedTo] = useState<string>("none");
  const [dueDate, setDueDate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!issue) return;
    setTitle(issue.title);
    setDescription(issue.description ?? "");
    setPriority(issue.priority);
    setLocation(issue.location ?? "");
    setAssignedTo(issue.assigned_to ?? "none");
    setDueDate(issue.due_date ?? "");
    setError(null);
    setSaved(false);
  }, [issue]);

  function handleSave() {
    if (!issue) return;
    setError(null);
    setSaved(false);

    startTransition(async () => {
      try {
        await updateIssue({
          id: issue.id,
          title,
          description: description || null,
          priority,
          location: location || null,
          assigned_to: assignedTo === "none" ? null : assignedTo,
          due_date: dueDate || null,
        });
        setSaved(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to save issue");
      }
    });
  }

  if (!issue) return null;

  const activeImages = issue.issue_images?.filter((img) => !img.deleted_at) ?? [];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        <div className="pr-8">
          <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-white">
            {issue.title}
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            {issue.project?.name ?? "Project"} · Reported {formatDate(issue.created_at)}
          </p>
        </div>

        <div className="mt-6 space-y-6">
          <div className="flex flex-wrap gap-2">
            <Badge className={getStatusColor(issue.priority)}>
              {ISSUE_PRIORITY_LABELS[issue.priority]}
            </Badge>
            <Badge className={getStatusColor(issue.status)}>
              {ISSUE_STATUS_LABELS[issue.status]}
            </Badge>
          </div>

          <div className="space-y-2">
            <Label>Status</Label>
            <UpdateIssueStatusSelect
              issueId={issue.id}
              currentStatus={issue.status as IssueStatus}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="issue-title">Title</Label>
            <Input
              id="issue-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="issue-description">Description</Label>
            <Textarea
              id="issue-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as IssuePriority)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(ISSUE_PRIORITY_LABELS) as IssuePriority[]).map((p) => (
                    <SelectItem key={p} value={p}>
                      {ISSUE_PRIORITY_LABELS[p]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="issue-due">Due date</Label>
              <Input
                id="issue-due"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Assigned to</Label>
            <Select value={assignedTo} onValueChange={setAssignedTo}>
              <SelectTrigger>
                <SelectValue placeholder="Unassigned" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Unassigned</SelectItem>
                {users.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="issue-location">Location</Label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                id="issue-location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="pl-9"
                placeholder="Building, floor, zone…"
              />
            </div>
          </div>

          {issue.assigned_user && (
            <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm dark:bg-slate-800/50">
              <UserIcon className="h-4 w-4 text-slate-400" />
              <span className="text-slate-600 dark:text-slate-300">
                {issue.assigned_user.full_name}
              </span>
            </div>
          )}

          {activeImages.length > 0 && (
            <div>
              <Label className="mb-2 block">Photos</Label>
              <IssueImageGallery images={activeImages} />
            </div>
          )}

          {issue.resolved_at && (
            <p className="text-sm text-emerald-600 dark:text-emerald-400">
              Resolved {formatDate(issue.resolved_at)}
            </p>
          )}

          {error && <p className="text-sm text-rose-600">{error}</p>}
          {saved && <p className="text-sm text-emerald-600">Changes saved.</p>}

          <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
            <Button onClick={handleSave} disabled={isPending} className="ops-btn-primary">
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving…
                </>
              ) : (
                "Save changes"
              )}
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href={`/admin/projects/${issue.project_id}`}>Open project</Link>
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
