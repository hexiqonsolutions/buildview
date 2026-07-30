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
  Reply,
  X,
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

type CommentThread = {
  root: ProjectCommentWithUser;
  replies: ProjectCommentWithUser[];
};

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

function buildThreads(items: ProjectCommentWithUser[]): CommentThread[] {
  const byId = new Map(items.map((c) => [c.id, c]));
  const replies = new Map<string, ProjectCommentWithUser[]>();

  for (const item of items) {
    if (!item.parent_id) continue;
    const rootId = byId.get(item.parent_id)?.parent_id
      ? byId.get(item.parent_id)!.parent_id!
      : item.parent_id;
    const list = replies.get(rootId) ?? [];
    list.push(item);
    replies.set(rootId, list);
  }

  return items
    .filter((c) => !c.parent_id)
    .map((root) => ({
      root,
      replies: (replies.get(root.id) ?? []).sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      ),
    }));
}

function CommentAuthor({ comment }: { comment: ProjectCommentWithUser }) {
  const authorRole = comment.author?.role as UserRole | undefined;
  const authorIsStaff = authorRole ? isBuildViewStaffRole(authorRole) : false;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm font-semibold text-slate-900 dark:text-white">
        {comment.author?.full_name || comment.author?.email || "Unknown user"}
      </span>
      {authorIsStaff && (
        <Badge className="gap-1 bg-slate-800 text-white hover:bg-slate-800 dark:bg-slate-200 dark:text-slate-900 dark:hover:bg-slate-200">
          <ShieldCheck className="h-3 w-3" /> BuildView Team
        </Badge>
      )}
      <span className="text-xs text-slate-400">{formatRelativeTime(comment.created_at)}</span>
    </div>
  );
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
  const [replyToId, setReplyToId] = useState<string | null>(null);
  const [replyMessage, setReplyMessage] = useState("");
  const showReportOption = reports.length > 0;
  const showDocumentOption = documents.length > 0;

  const threads = useMemo(() => buildThreads(items), [items]);
  const openCount = useMemo(
    () => items.filter((c) => !c.parent_id && c.status === "open").length,
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

  function refreshComments() {
    return getProjectComments(projectId).then(setItems);
  }

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
      await refreshComments();
      window.setTimeout(() => setSuccess(null), 2500);
    });
  }

  function handleReplySubmit(parentId: string) {
    if (!replyMessage.trim()) return;
    setError(null);
    setPendingId(parentId);

    startTransition(async () => {
      const result = await addProjectComment({
        project_id: projectId,
        message: replyMessage.trim(),
        parent_id: parentId,
      });

      if (!result.ok) {
        setError(result.error);
        setPendingId(null);
        return;
      }

      setReplyMessage("");
      setReplyToId(null);
      setError(null);
      setSuccess("Reply posted");
      await refreshComments();
      setPendingId(null);
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
        await refreshComments();
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
        if (replyToId === commentId) {
          setReplyToId(null);
          setReplyMessage("");
        }
        await refreshComments();
      }
      setPendingId(null);
    });
  }

  return (
    <section className="space-y-5" aria-label="Project comments">
      <div
        className={cn(
          "relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white",
          "shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_28px_-14px_rgba(15,23,42,0.14)]",
          "dark:border-slate-800 dark:bg-slate-900/60 dark:shadow-none",
          "motion-safe:animate-[fadeInUp_0.4s_ease-out_both]"
        )}
      >
        <div className="relative space-y-4 p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                Team discussion
              </p>
              <h3 className="mt-0.5 flex items-center gap-2 font-display text-base font-semibold text-slate-900 dark:text-white">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-600 ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700">
                  <MessageSquare className="h-3.5 w-3.5" />
                </span>
                Leave a comment for the team
              </h3>
            </div>
            {items.length > 0 && (
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span className="rounded-full bg-slate-100 px-2.5 py-1 font-medium dark:bg-slate-800">
                  {threads.length} thread{threads.length === 1 ? "" : "s"}
                </span>
                <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
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
                          <FileText className="h-3.5 w-3.5 text-slate-500" />
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
                className="min-h-[96px] rounded-xl border-slate-200 bg-slate-50/60 text-sm leading-relaxed focus-visible:ring-slate-400/30 dark:border-slate-700 dark:bg-slate-900"
              />
              <div className="flex items-center justify-between gap-2 text-[11px] text-slate-400">
                <span>Teammates can reply in the thread below</span>
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
                className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                {success}
              </p>
            )}

            <div className="flex justify-end">
              <Button
                type="submit"
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

      {threads.length === 0 ? (
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
            <span className="text-xs text-slate-400">Reply to keep the thread going</span>
          </div>

          <ul className="space-y-3">
            {threads.map(({ root, replies }, index) => {
              const isOwn = root.created_by === currentUserId;
              const canManage = isAdmin || isOwn;
              const busy = pendingId === root.id;
              const isOpen = root.status === "open";
              const parsed = parseCommentMessage(root.message);
              const isReplying = replyToId === root.id;

              return (
                <li
                  key={root.id}
                  style={{ animationDelay: `${Math.min(index, 8) * 50}ms` }}
                  className={cn(
                    "group overflow-hidden rounded-2xl border bg-white",
                    "shadow-[0_1px_2px_rgba(15,23,42,0.03),0_8px_20px_-12px_rgba(15,23,42,0.1)]",
                    "dark:bg-slate-900/60 dark:shadow-none",
                    "motion-safe:animate-[fadeInUp_0.4s_ease-out_both]",
                    isOpen
                      ? "border-slate-200/80 dark:border-slate-800"
                      : "border-slate-300 bg-slate-50/60 dark:border-slate-700 dark:bg-slate-900/40"
                  )}
                >
                  <div className="flex gap-3 p-4 sm:p-5">
                    <Avatar className="mt-0.5 h-10 w-10 shrink-0 ring-2 ring-white dark:ring-slate-900">
                      <AvatarImage
                        src={root.author?.avatar_url || undefined}
                        alt={root.author?.full_name || "User"}
                      />
                      <AvatarFallback className="bg-slate-100 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                        {initials(root.author?.full_name, root.author?.email)}
                      </AvatarFallback>
                    </Avatar>

                    <div className="min-w-0 flex-1 space-y-2.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <CommentAuthor comment={root} />
                        <Badge
                          className={cn(
                            "capitalize",
                            isOpen
                              ? "bg-slate-100 text-slate-700 ring-1 ring-slate-200/80 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700"
                              : "bg-slate-800 text-white hover:bg-slate-800 dark:bg-slate-200 dark:text-slate-900 dark:hover:bg-slate-200"
                          )}
                        >
                          {isOpen ? "Open" : "Resolved"}
                        </Badge>
                      </div>

                      {parsed.contextKind && parsed.contextLabel && (
                        <div className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
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

                      <div className="flex flex-wrap gap-1.5 pt-0.5">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 cursor-pointer gap-1.5 rounded-lg px-2.5 text-xs text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                          disabled={isPending}
                          onClick={() => {
                            setReplyToId(isReplying ? null : root.id);
                            setReplyMessage("");
                            setError(null);
                          }}
                        >
                          {isReplying ? (
                            <>
                              <X className="h-3.5 w-3.5" />
                              Cancel
                            </>
                          ) : (
                            <>
                              <Reply className="h-3.5 w-3.5" />
                              Reply
                              {replies.length > 0 ? ` (${replies.length})` : ""}
                            </>
                          )}
                        </Button>
                        {canManage && isAdmin && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-8 cursor-pointer gap-1.5 rounded-lg px-2.5 text-xs text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                            disabled={busy}
                            onClick={() => handleToggleStatus(root)}
                          >
                            {isOpen ? (
                              <>
                                <CheckCircle2 className="h-3.5 w-3.5" />
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
                        {canManage && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-8 cursor-pointer gap-1.5 rounded-lg px-2.5 text-xs text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:hover:bg-slate-800"
                            disabled={busy}
                            onClick={() => handleDelete(root.id)}
                          >
                            {busy ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="h-3.5 w-3.5" />
                            )}
                            Delete
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>

                  {(replies.length > 0 || isReplying) && (
                    <div className="space-y-3 border-t border-slate-100 bg-slate-50/50 px-4 py-4 sm:px-5 dark:border-slate-800 dark:bg-slate-950/40">
                      {replies.length > 0 && (
                        <ul className="space-y-3 border-l border-slate-200 pl-4 dark:border-slate-700">
                          {replies.map((reply) => {
                            const replyOwn = reply.created_by === currentUserId;
                            const replyManage = isAdmin || replyOwn;
                            const replyBusy = pendingId === reply.id;

                            return (
                              <li key={reply.id} className="flex gap-3">
                                <Avatar className="mt-0.5 h-8 w-8 shrink-0 ring-2 ring-white dark:ring-slate-900">
                                  <AvatarImage
                                    src={reply.author?.avatar_url || undefined}
                                    alt={reply.author?.full_name || "User"}
                                  />
                                  <AvatarFallback className="bg-slate-200 text-[10px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                                    {initials(reply.author?.full_name, reply.author?.email)}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="min-w-0 flex-1 space-y-1.5">
                                  <CommentAuthor comment={reply} />
                                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                                    {reply.message}
                                  </p>
                                  <div className="flex flex-wrap gap-1">
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 cursor-pointer gap-1 rounded-lg px-2 text-[11px] text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                                      disabled={isPending}
                                      onClick={() => {
                                        setReplyToId(root.id);
                                        setReplyMessage("");
                                        setError(null);
                                      }}
                                    >
                                      <Reply className="h-3 w-3" />
                                      Reply
                                    </Button>
                                    {replyManage && (
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 cursor-pointer gap-1 rounded-lg px-2 text-[11px] text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                                        disabled={replyBusy}
                                        onClick={() => handleDelete(reply.id)}
                                      >
                                        {replyBusy ? (
                                          <Loader2 className="h-3 w-3 animate-spin" />
                                        ) : (
                                          <Trash2 className="h-3 w-3" />
                                        )}
                                        Delete
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              </li>
                            );
                          })}
                        </ul>
                      )}

                      {isReplying && (
                        <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
                          <Label
                            htmlFor={`reply-${root.id}`}
                            className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400"
                          >
                            Reply to{" "}
                            {root.author?.full_name || root.author?.email || "this comment"}
                          </Label>
                          <Textarea
                            id={`reply-${root.id}`}
                            value={replyMessage}
                            onChange={(e) => setReplyMessage(e.target.value)}
                            placeholder="Write a reply for the team…"
                            rows={2}
                            maxLength={4000}
                            disabled={isPending}
                            autoFocus
                            className="min-h-[72px] rounded-lg border-slate-200 bg-slate-50/60 text-sm dark:border-slate-700 dark:bg-slate-950"
                          />
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-8 rounded-lg"
                              disabled={isPending}
                              onClick={() => {
                                setReplyToId(null);
                                setReplyMessage("");
                              }}
                            >
                              Cancel
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              className="h-8 gap-1.5 rounded-lg px-3"
                              disabled={isPending || !replyMessage.trim()}
                              onClick={() => handleReplySubmit(root.id)}
                            >
                              {pendingId === root.id && isPending ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Send className="h-3.5 w-3.5" />
                              )}
                              Post Reply
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
}
