"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import {
  Loader2,
  MessageSquare,
  ShieldCheck,
  Trash2,
  CheckCircle2,
  RotateCcw,
  FileText,
  FolderOpen,
  Building2,
  Send,
} from "lucide-react";
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
import { isBuildViewStaffRole } from "@/lib/auth/roles";
import { cn, formatRelativeTime } from "@/lib/utils";
import type { Document, ProjectCommentWithUser, Report, UserRole } from "@/lib/types";

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

function parseCommentMessage(message: string): {
  contextKind: "report" | "document" | null;
  contextLabel: string | null;
  body: string;
} {
  const match = message.match(/^\[(Report|Document):\s*(.+?)\]\s*([\s\S]*)$/i);
  if (!match) {
    return { contextKind: null, contextLabel: null, body: message };
  }
  const kind = match[1].toLowerCase() === "report" ? "report" : "document";
  return {
    contextKind: kind,
    contextLabel: match[2].trim(),
    body: (match[3] ?? "").trim() || message,
  };
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
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const showReportOption = reports.length > 0;
  const showDocumentOption = documents.length > 0;

  const openCount = useMemo(
    () => items.filter((c) => c.status === "open").length,
    [items]
  );

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
    setSuccess(null);

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
      setSuccess("Comment posted");
      const fresh = await getProjectComments(projectId);
      setItems(fresh);
      window.setTimeout(() => setSuccess(null), 2500);
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
    <section className="space-y-5" aria-label="Project comments">
      {/* Composer */}
      <div
        className={cn(
          "relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white",
          "shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_28px_-14px_rgba(15,23,42,0.14)]",
          "dark:border-slate-800 dark:bg-slate-900/60 dark:shadow-none",
          "motion-safe:animate-[fadeInUp_0.4s_ease-out_both]"
        )}
      >
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-br from-brand-accent/[0.06] via-transparent to-sky-500/[0.03]"
          aria-hidden
        />
        <div
          className="absolute inset-y-4 left-0 w-1 rounded-full bg-gradient-to-b from-brand-accent to-brand-accent/30"
          aria-hidden
        />

        <div className="relative space-y-4 p-5 pl-6 sm:p-6 sm:pl-7">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                Team discussion
              </p>
              <h3 className="mt-0.5 flex items-center gap-2 font-display text-base font-semibold text-slate-900 dark:text-white">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-accent/12 text-brand-accent ring-1 ring-brand-accent/15">
                  <MessageSquare className="h-3.5 w-3.5" />
                </span>
                Leave a comment for the team
              </h3>
            </div>
            {items.length > 0 && (
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span className="rounded-full bg-slate-100 px-2.5 py-1 font-medium dark:bg-slate-800">
                  {items.length} total
                </span>
                <span className="rounded-full bg-amber-500/10 px-2.5 py-1 font-medium text-amber-700 dark:text-amber-300">
                  {openCount} open
                </span>
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                  Comment on
                </Label>
                <Select
                  value={contextType}
                  onValueChange={(v) => {
                    setContextType(v as "project" | "report" | "document");
                    setContextId("");
                  }}
                >
                  <SelectTrigger className="h-10 rounded-xl border-slate-200 bg-slate-50/80 dark:border-slate-700 dark:bg-slate-900">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="project">
                      <span className="inline-flex items-center gap-2">
                        <Building2 className="h-3.5 w-3.5 text-slate-500" />
                        Project
                      </span>
                    </SelectItem>
                    {showReportOption && (
                      <SelectItem value="report">
                        <span className="inline-flex items-center gap-2">
                          <FileText className="h-3.5 w-3.5 text-sky-600" />
                          Report
                        </span>
                      </SelectItem>
                    )}
                    {showDocumentOption && (
                      <SelectItem value="document">
                        <span className="inline-flex items-center gap-2">
                          <FolderOpen className="h-3.5 w-3.5 text-slate-600" />
                          Document
                        </span>
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              {contextType === "report" && (
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                    Report
                  </Label>
                  <Select value={contextId || undefined} onValueChange={setContextId}>
                    <SelectTrigger className="h-10 rounded-xl border-slate-200 bg-slate-50/80 dark:border-slate-700 dark:bg-slate-900">
                      <SelectValue placeholder="Select report" />
                    </SelectTrigger>
                    <SelectContent>
                      {reports.map((r) => (
                        <SelectItem key={r.id} value={r.id}>
                          {r.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {contextType === "document" && (
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                    Document
                  </Label>
                  <Select value={contextId || undefined} onValueChange={setContextId}>
                    <SelectTrigger className="h-10 rounded-xl border-slate-200 bg-slate-50/80 dark:border-slate-700 dark:bg-slate-900">
                      <SelectValue placeholder="Select document" />
                    </SelectTrigger>
                    <SelectContent>
                      {documents.map((d) => (
                        <SelectItem key={d.id} value={d.id}>
                          {d.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label
                htmlFor="project-comment-message"
                className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400"
              >
                Message
              </Label>
              <Textarea
                id="project-comment-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Tell the team about changes you'd like, questions, or feedback…"
                rows={3}
                maxLength={4000}
                disabled={isPending}
                className="min-h-[96px] rounded-xl border-slate-200 bg-slate-50/60 text-sm leading-relaxed focus-visible:ring-brand-accent/30 dark:border-slate-700 dark:bg-slate-900"
              />
              <div className="flex items-center justify-between gap-2 text-[11px] text-slate-400">
                <span>
                  {contextType === "project"
                    ? "Visible on this project"
                    : `Tagged to selected ${contextType}`}
                </span>
                <span className="tabular-nums">{message.length}/4000</span>
              </div>
            </div>

            {error && (
              <p
                role="alert"
                className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300"
              >
                {error}
              </p>
            )}
            {success && (
              <p
                role="status"
                className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300"
              >
                {success}
              </p>
            )}

            <div className="flex justify-end">
              <Button
                type="submit"
                variant="accent"
                size="sm"
                disabled={isPending || !message.trim()}
                className="h-9 gap-1.5 rounded-xl px-4"
              >
                {isPending && !pendingId ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-3.5 w-3.5" />
                )}
                Post Comment
              </Button>
            </div>
          </form>
        </div>
      </div>

      {/* Thread */}
      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 py-2 dark:border-slate-800 dark:bg-slate-900/30">
          <EmptyState
            icon={MessageSquare}
            title="No comments yet"
            description="Start the conversation — ask a question or request a change above."
          />
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2 px-0.5">
            <h4 className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
              Conversation
            </h4>
            <span className="text-xs text-slate-400">Newest at the bottom</span>
          </div>

          <ul className="space-y-3">
            {items.map((comment, index) => {
              const authorRole = comment.author?.role as UserRole | undefined;
              const authorIsStaff = authorRole ? isBuildViewStaffRole(authorRole) : false;
              const isOwn = comment.created_by === currentUserId;
              const canManage = isAdmin || isOwn;
              const busy = pendingId === comment.id;
              const isOpen = comment.status === "open";
              const parsed = parseCommentMessage(comment.message);

              return (
                <li
                  key={comment.id}
                  style={{ animationDelay: `${Math.min(index, 8) * 50}ms` }}
                  className={cn(
                    "group relative overflow-hidden rounded-2xl border bg-white",
                    "shadow-[0_1px_2px_rgba(15,23,42,0.03),0_8px_20px_-12px_rgba(15,23,42,0.1)]",
                    "transition-all duration-200 ease-out",
                    "hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(15,23,42,0.05),0_14px_28px_-12px_rgba(15,23,42,0.12)]",
                    "dark:bg-slate-900/60 dark:shadow-none",
                    "motion-safe:animate-[fadeInUp_0.4s_ease-out_both]",
                    isOpen
                      ? "border-slate-200/80 dark:border-slate-800"
                      : "border-emerald-200/70 bg-emerald-50/20 dark:border-emerald-900/40 dark:bg-emerald-950/10"
                  )}
                >
                  <div
                    className={cn(
                      "absolute inset-y-3 left-0 w-1 rounded-full",
                      isOpen
                        ? "bg-gradient-to-b from-amber-400 to-amber-400/30"
                        : "bg-gradient-to-b from-emerald-500 to-emerald-400/30"
                    )}
                    aria-hidden
                  />

                  <div className="flex gap-3 p-4 pl-5 sm:p-5 sm:pl-6">
                    <Avatar className="mt-0.5 h-10 w-10 shrink-0 ring-2 ring-white dark:ring-slate-900">
                      <AvatarImage
                        src={comment.author?.avatar_url || undefined}
                        alt={comment.author?.full_name || "User"}
                      />
                      <AvatarFallback
                        className={cn(
                          "text-xs font-semibold",
                          authorIsStaff
                            ? "bg-brand-accent/20 text-brand-accent"
                            : "bg-sky-500/15 text-sky-700 dark:text-sky-300"
                        )}
                      >
                        {initials(comment.author?.full_name, comment.author?.email)}
                      </AvatarFallback>
                    </Avatar>

                    <div className="min-w-0 flex-1 space-y-2.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-slate-900 dark:text-white">
                          {comment.author?.full_name ||
                            comment.author?.email ||
                            "Unknown user"}
                        </span>
                        {authorIsStaff && (
                          <Badge className="gap-1 bg-brand-accent/15 text-brand-accent hover:bg-brand-accent/15">
                            <ShieldCheck className="h-3 w-3" /> BuildView Team
                          </Badge>
                        )}
                        <Badge
                          className={cn(
                            "capitalize",
                            isOpen
                              ? "bg-amber-500/10 text-amber-700 hover:bg-amber-500/10 dark:text-amber-300"
                              : "bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/10 dark:text-emerald-300"
                          )}
                        >
                          {isOpen ? "Open" : "Resolved"}
                        </Badge>
                        <span className="text-xs text-slate-400">
                          {formatRelativeTime(comment.created_at)}
                        </span>
                      </div>

                      {parsed.contextKind && parsed.contextLabel && (
                        <div
                          className={cn(
                            "inline-flex max-w-full items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium",
                            parsed.contextKind === "report"
                              ? "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900/50 dark:bg-sky-950/40 dark:text-sky-300"
                              : "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                          )}
                        >
                          {parsed.contextKind === "report" ? (
                            <FileText className="h-3 w-3 shrink-0" />
                          ) : (
                            <FolderOpen className="h-3 w-3 shrink-0" />
                          )}
                          <span className="truncate">
                            {parsed.contextKind === "report" ? "Report" : "Document"}:{" "}
                            {parsed.contextLabel}
                          </span>
                        </div>
                      )}

                      <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                        {parsed.body}
                      </p>

                      {canManage && (
                        <div className="flex flex-wrap gap-1.5 pt-0.5 opacity-100 transition-opacity sm:opacity-80 sm:group-hover:opacity-100">
                          {isAdmin && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-8 cursor-pointer gap-1.5 rounded-lg px-2.5 text-xs text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                              disabled={busy}
                              onClick={() => handleToggleStatus(comment)}
                            >
                              {isOpen ? (
                                <>
                                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                                  Mark Resolved
                                </>
                              ) : (
                                <>
                                  <RotateCcw className="h-3.5 w-3.5" />
                                  Reopen
                                </>
                              )}
                            </Button>
                          )}
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-8 cursor-pointer gap-1.5 rounded-lg px-2.5 text-xs text-red-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30"
                            disabled={busy}
                            onClick={() => handleDelete(comment.id)}
                          >
                            {busy ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="h-3.5 w-3.5" />
                            )}
                            Delete
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
}
