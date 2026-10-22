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
  Send,
  X,
  Heart,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { EmptyState } from "@/components/dashboard/empty-state";
import {
  addProjectComment,
  deleteProjectComment,
  getProjectComments,
  toggleProjectCommentLike,
  updateCommentStatus,
} from "@/lib/actions/comments";
import { isBuildViewStaffRole } from "@/lib/auth/roles";
import { useOptionalPortalWorkspace } from "@/components/portal/workspace/portal-workspace-provider";
import { cn, formatRelativeTime, getInitials } from "@/lib/utils";
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
    <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
      <span className="truncate text-[13px] font-bold text-slate-800 dark:text-slate-100">
        {comment.author?.full_name || comment.author?.email || "Unknown user"}
      </span>
      {authorIsStaff && (
        <Badge className="gap-1 bg-slate-800 text-white hover:bg-slate-800 dark:bg-slate-200 dark:text-slate-900 dark:hover:bg-slate-200">
          <ShieldCheck className="h-3 w-3" /> BuildView Team
        </Badge>
      )}
    </span>
  );
}

/** Team discussion is a construction-intelligence feature; portfolio showcase portals omit it. */
export function ProjectCommentsSection(props: ProjectCommentsSectionProps) {
  const portal = useOptionalPortalWorkspace();
  if (portal?.dashboardType === "portfolio") return null;
  return <ProjectCommentsPanel {...props} />;
}

function ProjectCommentsPanel({
  projectId,
  comments,
  currentUserId,
  isAdmin = false,
}: ProjectCommentsSectionProps) {
  const [items, setItems] = useState(comments);
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [likePendingId, setLikePendingId] = useState<string | null>(null);
  const [replyToId, setReplyToId] = useState<string | null>(null);
  const [replyMessage, setReplyMessage] = useState("");

  const threads = useMemo(() => buildThreads(items), [items]);
  const openCount = useMemo(
    () => items.filter((c) => !c.parent_id && c.status === "open").length,
    [items]
  );

  useEffect(() => {
    setItems(comments);
  }, [comments]);

  function refreshComments() {
    return getProjectComments(projectId).then(setItems);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim()) return;
    setError(null);
    setSuccess(null);

    startTransition(async () => {
      const result = await addProjectComment({
        project_id: projectId,
        message: message.trim(),
        context_type: "project",
      });

      if (!result.ok) {
        setError(result.error);
        return;
      }

      setMessage("");
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

  function handleToggleLike(comment: ProjectCommentWithUser) {
    if (likePendingId === comment.id) return;
    const prevLiked = Boolean(comment.liked_by_me);
    const prevCount = comment.like_count ?? 0;

    // Optimistic flip; reconciled with the server count below.
    setItems((current) =>
      current.map((c) =>
        c.id === comment.id
          ? {
              ...c,
              liked_by_me: !prevLiked,
              like_count: Math.max(0, prevCount + (prevLiked ? -1 : 1)),
            }
          : c
      )
    );
    setLikePendingId(comment.id);

    startTransition(async () => {
      const result = await toggleProjectCommentLike(comment.id);
      setLikePendingId(null);
      if (result.ok) {
        setItems((current) =>
          current.map((c) =>
            c.id === comment.id
              ? { ...c, liked_by_me: result.liked, like_count: result.likeCount }
              : c
          )
        );
      } else {
        setItems((current) =>
          current.map((c) =>
            c.id === comment.id
              ? { ...c, liked_by_me: prevLiked, like_count: prevCount }
              : c
          )
        );
        setError(result.error);
      }
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

          <ul className="space-y-7">
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
                  className="motion-safe:animate-[fadeInUp_0.4s_ease-out_both]"
                >
                  <div className="flex gap-3 sm:gap-3.5">
                    {/* Avatar rail — the line links the comment to its replies */}
                    <div className="flex flex-col items-center self-stretch">
                      <Avatar className="h-10 w-10 shrink-0 ring-2 ring-white dark:ring-slate-900">
                        <AvatarImage
                          src={root.author?.avatar_url || undefined}
                          alt={root.author?.full_name || "User"}
                        />
                        <AvatarFallback className="bg-[#e4e7fb] text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                          {getInitials(root.author?.full_name, root.author?.email)}
                        </AvatarFallback>
                      </Avatar>
                      {(replies.length > 0 || isReplying) && (
                        <span
                          aria-hidden
                          className="mt-1.5 w-px flex-1 bg-slate-200 dark:bg-slate-700/70"
                        />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      {/* Comment bubble */}
                      <div
                        className={cn(
                          "rounded-2xl rounded-tl-md px-4 py-3",
                          isOpen
                            ? "bg-slate-100 dark:bg-slate-800/70"
                            : "bg-slate-50 opacity-75 ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700"
                        )}
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <CommentAuthor comment={root} />
                          <Badge
                            className={cn(
                              "capitalize",
                              isOpen
                                ? "bg-white/70 text-slate-600 ring-1 ring-slate-200/80 hover:bg-white/70 dark:bg-slate-900/60 dark:text-slate-300 dark:ring-slate-700"
                                : "bg-slate-800 text-white hover:bg-slate-800 dark:bg-slate-200 dark:text-slate-900 dark:hover:bg-slate-200"
                            )}
                          >
                            {isOpen ? "Open" : "Resolved"}
                          </Badge>
                        </div>

                        {parsed.contextKind && parsed.contextLabel && (
                          <div className="mt-2 inline-flex max-w-full items-center gap-1.5 rounded-full border border-slate-200 bg-white/70 px-2.5 py-1 text-[11px] font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
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

                        <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-slate-500 dark:text-slate-300">
                          {parsed.body}
                        </p>
                      </div>

                      {/* Quiet action row under the bubble */}
                      <div className="mt-0.5 flex flex-wrap items-center gap-x-0.5 px-1">
                        <button
                          type="button"
                          onClick={() => handleToggleLike(root)}
                          disabled={likePendingId === root.id}
                          aria-pressed={Boolean(root.liked_by_me)}
                          className={cn(
                            "inline-flex min-h-8 cursor-pointer items-center gap-1.5 rounded-full px-2 text-xs font-semibold transition-colors disabled:opacity-60",
                            root.liked_by_me
                              ? "text-[#6a9a10] dark:text-lime-300"
                              : "text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                          )}
                        >
                          <Heart
                            className={cn("h-3.5 w-3.5", root.liked_by_me && "fill-current")}
                          />
                          Like
                          {(root.like_count ?? 0) > 0 && (
                            <span className="tabular-nums">{root.like_count}</span>
                          )}
                        </button>
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() => {
                            setReplyToId(isReplying ? null : root.id);
                            setReplyMessage("");
                            setError(null);
                          }}
                          className="inline-flex min-h-8 cursor-pointer items-center gap-1.5 rounded-full px-2 text-xs font-semibold text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 disabled:opacity-60 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                        >
                          {isReplying ? (
                            <>
                              <X className="h-3.5 w-3.5" />
                              Cancel
                            </>
                          ) : (
                            <>
                              Reply
                              {replies.length > 0 && (
                                <span className="tabular-nums">({replies.length})</span>
                              )}
                            </>
                          )}
                        </button>
                        <span className="px-1.5 text-xs text-slate-400">
                          {formatRelativeTime(root.created_at)}
                        </span>

                        <span className="min-w-2 flex-1" />

                        {canManage && isAdmin && (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => handleToggleStatus(root)}
                            className="inline-flex min-h-8 cursor-pointer items-center gap-1.5 rounded-full px-2 text-xs font-medium text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 disabled:opacity-60 dark:hover:bg-slate-800 dark:hover:text-slate-200"
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
                          </button>
                        )}
                        {canManage && (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => handleDelete(root.id)}
                            className="inline-flex min-h-8 cursor-pointer items-center gap-1.5 rounded-full px-2 text-xs font-medium text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 disabled:opacity-60 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                          >
                            {busy ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="h-3.5 w-3.5" />
                            )}
                            Delete
                          </button>
                        )}
                      </div>

                      {replies.length > 0 && (
                        <ul className="mt-4 space-y-4">
                          {replies.map((reply) => {
                            const replyOwn = reply.created_by === currentUserId;
                            const replyManage = isAdmin || replyOwn;
                            const replyBusy = pendingId === reply.id;

                            return (
                              <li key={reply.id} className="relative flex gap-2.5 sm:gap-3">
                                {/* Elbow joining the reply to the thread rail */}
                                <span
                                  aria-hidden
                                  className="absolute -left-8 top-4 h-px w-2.5 bg-slate-200 sm:-left-[34px] sm:w-3.5 dark:bg-slate-700/70"
                                />
                                <Avatar className="relative z-10 h-8 w-8 shrink-0 ring-2 ring-white dark:ring-slate-900">
                                  <AvatarImage
                                    src={reply.author?.avatar_url || undefined}
                                    alt={reply.author?.full_name || "User"}
                                  />
                                  <AvatarFallback className="bg-[#e4e7fb] text-[10px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                                    {getInitials(reply.author?.full_name, reply.author?.email)}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="min-w-0 flex-1">
                                  <div className="rounded-2xl rounded-tl-md bg-slate-100 px-3.5 py-2.5 dark:bg-slate-800/70">
                                    <CommentAuthor comment={reply} />
                                    <p className="mt-0.5 whitespace-pre-wrap text-sm leading-relaxed text-slate-500 dark:text-slate-300">
                                      {reply.message}
                                    </p>
                                  </div>
                                  <div className="mt-0.5 flex flex-wrap items-center gap-x-0.5 px-1">
                                    <button
                                      type="button"
                                      onClick={() => handleToggleLike(reply)}
                                      disabled={likePendingId === reply.id}
                                      aria-pressed={Boolean(reply.liked_by_me)}
                                      className={cn(
                                        "inline-flex min-h-8 cursor-pointer items-center gap-1.5 rounded-full px-2 text-xs font-semibold transition-colors disabled:opacity-60",
                                        reply.liked_by_me
                                          ? "text-[#6a9a10] dark:text-lime-300"
                                          : "text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                                      )}
                                    >
                                      <Heart
                                        className={cn(
                                          "h-3.5 w-3.5",
                                          reply.liked_by_me && "fill-current"
                                        )}
                                      />
                                      Like
                                      {(reply.like_count ?? 0) > 0 && (
                                        <span className="tabular-nums">{reply.like_count}</span>
                                      )}
                                    </button>
                                    <button
                                      type="button"
                                      disabled={isPending}
                                      onClick={() => {
                                        setReplyToId(root.id);
                                        setReplyMessage("");
                                        setError(null);
                                      }}
                                      className="inline-flex min-h-8 cursor-pointer items-center rounded-full px-2 text-xs font-semibold text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 disabled:opacity-60 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                                    >
                                      Reply
                                    </button>
                                    <span className="px-1.5 text-xs text-slate-400">
                                      {formatRelativeTime(reply.created_at)}
                                    </span>
                                    {replyManage && (
                                      <>
                                        <span className="min-w-2 flex-1" />
                                        <button
                                          type="button"
                                          disabled={replyBusy}
                                          onClick={() => handleDelete(reply.id)}
                                          className="inline-flex min-h-8 cursor-pointer items-center gap-1.5 rounded-full px-2 text-xs font-medium text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 disabled:opacity-60 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                                        >
                                          {replyBusy ? (
                                            <Loader2 className="h-3 w-3 animate-spin" />
                                          ) : (
                                            <Trash2 className="h-3 w-3" />
                                          )}
                                          Delete
                                        </button>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </li>
                            );
                          })}
                        </ul>
                      )}

                      {isReplying && (
                        <div className="mt-3 space-y-2 rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
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
