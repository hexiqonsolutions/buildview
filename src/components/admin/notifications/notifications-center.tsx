"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import {
  Bell,
  CheckCheck,
  AlertTriangle,
  FileText,
  Receipt,
  Info,
  Loader2,
} from "lucide-react";
import {
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/actions/notifications";
import { notifyNotificationsChanged } from "@/components/admin/notifications/notification-bell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn, formatRelativeTime } from "@/lib/utils";
import type { Notification, NotificationType } from "@/lib/types";

const TYPE_ICONS: Record<NotificationType, React.ComponentType<{ className?: string }>> = {
  info: Info,
  success: CheckCheck,
  warning: AlertTriangle,
  error: AlertTriangle,
  project_update: FileText,
  issue_update: AlertTriangle,
  invoice_update: Receipt,
};

const TYPE_COLORS: Record<NotificationType, string> = {
  info: "bg-slate-100 text-slate-600 dark:bg-slate-800",
  success: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  warning: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  error: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
  project_update: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  issue_update: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
  invoice_update: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
};

type Filter = "all" | "unread";

export function NotificationsCenter({
  notifications,
  scopedEmpty = false,
}: {
  notifications: Notification[];
  scopedEmpty?: boolean;
}) {
  const [items, setItems] = useState(notifications);
  const [filter, setFilter] = useState<Filter>("all");
  const [isPending, startTransition] = useTransition();

  // Opening the inbox marks everything read and clears the header badge.
  useEffect(() => {
    const hasUnread = notifications.some((n) => !n.is_read);
    if (!hasUnread) {
      notifyNotificationsChanged();
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        await markAllNotificationsRead();
        if (cancelled) return;
        setItems((prev) =>
          prev.map((n) => ({
            ...n,
            is_read: true,
            read_at: n.read_at ?? new Date().toISOString(),
          }))
        );
        notifyNotificationsChanged();
      } catch {
        // Keep unread state if mark-all fails
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [notifications]);

  const filtered = useMemo(() => {
    if (filter === "unread") return items.filter((n) => !n.is_read);
    return items;
  }, [items, filter]);

  const unreadCount = items.filter((n) => !n.is_read).length;

  function handleMarkRead(id: string) {
    startTransition(async () => {
      await markNotificationRead(id);
      setItems((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true, read_at: new Date().toISOString() } : n))
      );
      notifyNotificationsChanged();
    });
  }

  function handleMarkAllRead() {
    startTransition(async () => {
      await markAllNotificationsRead();
      setItems((prev) =>
        prev.map((n) => ({ ...n, is_read: true, read_at: new Date().toISOString() }))
      );
      notifyNotificationsChanged();
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          <Button
            variant={filter === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("all")}
          >
            All ({items.length})
          </Button>
          <Button
            variant={filter === "unread" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("unread")}
          >
            Unread ({unreadCount})
          </Button>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={handleMarkAllRead} disabled={isPending}>
            {isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <CheckCheck className="mr-2 h-4 w-4" />
            )}
            Mark all read
          </Button>
        )}
      </div>

      <div className="ops-card divide-y divide-slate-100 dark:divide-slate-800">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center px-6 py-16 text-center">
            <Bell className="mb-3 h-10 w-10 text-slate-300" />
            <p className="font-medium text-slate-900 dark:text-white">No notifications</p>
            <p className="mt-1 text-sm text-slate-500">
              {scopedEmpty
                ? "No alerts for this workspace. Clear project filters or check back later."
                : filter === "unread"
                  ? "You're all caught up."
                  : "Alerts for uploads, issues, and billing will appear here."}
            </p>
          </div>
        ) : (
          filtered.map((notification) => {
            const Icon = TYPE_ICONS[notification.type];
            return (
              <div
                key={notification.id}
                className={cn(
                  "flex items-start gap-3 px-5 py-4 transition-colors",
                  !notification.is_read && "bg-brand-accent/[0.03]"
                )}
              >
                <div
                  className={cn(
                    "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                    TYPE_COLORS[notification.type]
                  )}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium text-slate-900 dark:text-white">
                      {notification.title}
                    </p>
                    {!notification.is_read && (
                      <Badge variant="secondary" className="h-5 text-[10px]">
                        New
                      </Badge>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                    {notification.message}
                  </p>
                  <p className="mt-2 text-xs text-slate-400">
                    {formatRelativeTime(notification.created_at)}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {notification.link && (
                      <Button variant="outline" size="sm" asChild>
                        <Link href={notification.link}>View</Link>
                      </Button>
                    )}
                    {!notification.is_read && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleMarkRead(notification.id)}
                        disabled={isPending}
                      >
                        Mark read
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
