"use client";

import { useState, useTransition } from "react";
import { Loader2, MessageSquare, ShieldCheck, Trash2, CheckCircle2, RotateCcw } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/dashboard/empty-state";
import {
  addProjectComment,
  deleteProjectComment,
  updateCommentStatus,
} from "@/lib/actions/comments";
import { cn, formatRelativeTime, getStatusColor } from "@/lib/utils";
import type { ProjectCommentWithUser } from "@/lib/types";

interface ProjectCommentsSectionProps {
  projectId: string;
  comments: ProjectCommentWithUser[];
  currentUserId?: string;
  isAdmin?: boolean;
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
}: ProjectCommentsSectionProps) {
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [pendingId, setPendingId] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim()) return;
    setError(null);
    startTransition(async () => {
      try {
        await addProjectComment({ project_id: projectId, message: message.trim() });
        setMessage("");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to post comment");
      }
    });
  }

  function handleToggleStatus(comment: ProjectCommentWithUser) {
    setPendingId(comment.id);
    startTransition(async () => {
      try {
        await updateCommentStatus(
          comment.id,
          comment.status === "open" ? "resolved" : "open"
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to update comment");
      }
      setPendingId(null);
    });
  }

  function handleDelete(commentId: string) {
    setPendingId(commentId);
    startTransition(async () => {
      try {
        await deleteProjectComment(commentId);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to delete comment");
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
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Tell the team about changes you'd like, questions, or feedback on this project…"
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

      {comments.length === 0 ? (
        <EmptyState
          icon={MessageSquare}
          title="No comments yet"
          description="Start the conversation — ask a question or request a change above."
        />
      ) : (
        <div className="space-y-4">
          {comments.map((comment) => {
            const authorIsAdmin = comment.author?.role === "super_admin";
            const isOwn = comment.created_by === currentUserId;
            const canManage = isAdmin || isOwn;
            const busy = pendingId === comment.id;

            return (
              <div key={comment.id} className="surface-card flex gap-3 p-4">
                <Avatar className="h-9 w-9 shrink-0">
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
