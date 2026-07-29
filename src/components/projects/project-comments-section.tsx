"use client";

import { useEffect, useState, useTransition } from "react";
import { Loader2, MessageSquare, ShieldCheck, Trash2, CheckCircle2, RotateCcw } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "@/components/dashboard/empty-state";
import {
  addProjectComment,
  deleteProjectComment,
  getProjectComments,
  updateCommentStatus,
} from "@/lib/actions/comments";
import { cn, formatRelativeTime, getStatusColor } from "@/lib/utils";
import type { Document, ProjectCommentWithUser, Report } from "@/lib/types";

interface ProjectCommentsSectionProps {
  projectId: string;
  comments: ProjectCommentWithUser[];
  currentUserId?: string;
  isAdmin?: boolean;
  reports?: Report[];
  documents?: Document[];
}

function initials(name?: string | null, email?: string | null) {
  const source = name?.trim() || email?.trim() || "?";
  return source
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function ProjectCommentsSection({
  projectId,
  comments,
  currentUserId,
  isAdmin = false,
  reports = [],
  documents = [],
}: ProjectCommentsSectionProps) {
  const [items, setItems] = useState(comments);
  const [message, setMessage] = useState("");
  const [contextType, setContextType] = useState<"project" | "report" | "document">("project");
  const [contextId, setContextId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const showReportOption = reports.length > 0;
  const showDocumentOption = documents.length > 0;

  useEffect(() => {
    setItems(comments);
  }, [comments]);

  useEffect(() => {
    if (contextType === "report" && !showReportOption) {
      setContextType("project");
      setContextId("");
    }
    if (contextType === "document" && !showDocumentOption) {
      setContextType("project");
      setContextId("");
    }
  }, [contextType, showReportOption, showDocumentOption]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim()) return;
    setError(null);

    let context_label: string | undefined;
    if (contextType === "report") {
      context_label = reports.find((r) => r.id === contextId)?.title;
      if (!context_label) {
        setError("Select a report to comment on.");
        return;
      }
    }
    if (contextType === "document") {
      context_label = documents.find((d) => d.id === contextId)?.name;
      if (!context_label) {
        setError("Select a document to comment on.");
        return;
      }
    }

    startTransition(async () => {
      const result = await addProjectComment({
        project_id: projectId,
        message: message.trim(),
        context_type: contextType,
        context_label,
      });

      if (!result.ok) {
        setError(result.error);
        return;
      }

      setMessage("");
      setContextType("project");
      setContextId("");
      setError(null);
      const fresh = await getProjectComments(projectId);
      setItems(fresh);
    });
  }

  function handleToggleStatus(comment: ProjectCommentWithUser) {
    setPendingId(comment.id);
    startTransition(async () => {
      const result = await updateCommentStatus(
        comment.id,
        comment.status === "open" ? "resolved" : "open"
      );

      if (!result.ok) {
        setError(result.error);
      } else {
        setError(null);
        const fresh = await getProjectComments(projectId);
        setItems(fresh);
      }
      setPendingId(null);
    });
  }

  function handleDelete(commentId: string) {
    setPendingId(commentId);
    startTransition(async () => {
      const result = await deleteProjectComment(commentId);

      if (!result.ok) {
        setError(result.error);
      } else {
        setError(null);
        const fresh = await getProjectComments(projectId);
        setItems(fresh);
      }
      setPendingId(null);
    });
  }

  return (
    <div className="space-y-6">
      <div className="surface-card space-y-3 p-5">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-brand-accent" />
          <h3 className="font-display text-sm font-semibold text-brand-primary dark:text-white">
            Leave a comment for the team
          </h3>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div className="space-y-1">
              <Label className="text-xs text-slate-500">Comment on</Label>
              <Select
                value={contextType}
                onValueChange={(v) => {
                  setContextType(v as "project" | "report" | "document");
                  setContextId("");
                }}
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="project">Project</SelectItem>
                  {showReportOption && <SelectItem value="report">Report</SelectItem>}
                  {showDocumentOption && <SelectItem value="document">Document</SelectItem>}
                </SelectContent>
              </Select>
            </div>
            {contextType === "report" && (
              <div className="space-y-1">
                <Label className="text-xs text-slate-500">Report</Label>
                <Select value={contextId || undefined} onValueChange={setContextId}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Select report" />
                  </SelectTrigger>
                  <SelectContent>
                    {reports.length === 0 ? (
                      <SelectItem value="_none" disabled>
                        No reports yet
                      </SelectItem>
                    ) : (
                      reports.map((r) => (
                        <SelectItem key={r.id} value={r.id}>
                          {r.title}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}
            {contextType === "document" && (
              <div className="space-y-1">
                <Label className="text-xs text-slate-500">Document</Label>
                <Select value={contextId || undefined} onValueChange={setContextId}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Select document" />
                  </SelectTrigger>
                  <SelectContent>
                    {documents.length === 0 ? (
                      <SelectItem value="_none" disabled>
                        No documents yet
                      </SelectItem>
                    ) : (
                      documents.map((d) => (
                        <SelectItem key={d.id} value={d.id}>
                          {d.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Tell the team about changes you'd like, questions, or feedback…"
            rows={3}
            maxLength={4000}
            disabled={isPending}
          />
          {error && <p className="text-sm text-red-500">{error}</p>}
          <div className="flex justify-end">
            <Button type="submit" variant="accent" size="sm" disabled={isPending || !message.trim()}>
              {isPending && !pendingId && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Post Comment
            </Button>
          </div>
        </form>
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={MessageSquare}
          title="No comments yet"
          description="Start the conversation — ask a question or request a change above."
        />
      ) : (
        <div className="space-y-4">
          {items.map((comment) => {
            const authorIsAdmin = comment.author?.role === "super_admin";
            const isOwn = comment.created_by === currentUserId;
            const canManage = isAdmin || isOwn;
            const busy = pendingId === comment.id;

            return (
              <div key={comment.id} className="surface-card flex gap-3 p-4">
                <Avatar className="h-9 w-9 shrink-0">
                  <AvatarImage
                    src={comment.author?.avatar_url || undefined}
                    alt={comment.author?.full_name || "User"}
                  />
                  <AvatarFallback
                    className={cn(
                      "text-xs font-semibold",
                      authorIsAdmin
                        ? "bg-brand-accent/20 text-brand-accent"
                        : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                    )}
                  >
                    {initials(comment.author?.full_name, comment.author?.email)}
                  </AvatarFallback>
                </Avatar>

                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-brand-primary dark:text-white">
                      {comment.author?.full_name || comment.author?.email || "Unknown user"}
                    </span>
                    {authorIsAdmin && (
                      <Badge className="gap-1 bg-brand-accent/15 text-brand-accent hover:bg-brand-accent/15">
                        <ShieldCheck className="h-3 w-3" /> BuildView Team
                      </Badge>
                    )}
                    <Badge className={getStatusColor(comment.status)}>
                      {comment.status === "open" ? "Open" : "Resolved"}
                    </Badge>
                    <span className="text-xs text-slate-400">
                      {formatRelativeTime(comment.created_at)}
                    </span>
                  </div>

                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                    {comment.message}
                  </p>

                  {canManage && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {isAdmin && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs"
                          disabled={busy}
                          onClick={() => handleToggleStatus(comment)}
                        >
                          {comment.status === "open" ? (
                            <>
                              <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Mark Resolved
                            </>
                          ) : (
                            <>
                              <RotateCcw className="mr-1 h-3.5 w-3.5" /> Reopen
                            </>
                          )}
                        </Button>
                      )}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs text-red-500 hover:text-red-600"
                        disabled={busy}
                        onClick={() => handleDelete(comment.id)}
                      >
                        <Trash2 className="mr-1 h-3.5 w-3.5" /> Delete
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
