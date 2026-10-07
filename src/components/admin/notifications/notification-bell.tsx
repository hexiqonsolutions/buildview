"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  AlertTriangle,
  Bell,
  CheckCheck,
  FileText,
  Info,
  Loader2,
  ReceiptIndianRupee,
} from "lucide-react";
import {
  getNotifications,
  getUnreadNotificationCount,
  markAllNotificationsRead,
} from "@/lib/actions/notifications";
import { useNotificationRealtime } from "@/hooks/use-notification-realtime";
import { resolveNotificationHref } from "@/lib/portal/notification-links";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn, formatRelativeTime } from "@/lib/utils";
import type { Notification, NotificationType } from "@/lib/types";

export const NOTIFICATIONS_CHANGED_EVENT = "buildview:notifications-changed";

export function notifyNotificationsChanged() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(NOTIFICATIONS_CHANGED_EVENT));
  }
}

const DROPDOWN_LIMIT = 30;

const TYPE_ICONS: Record<NotificationType, React.ComponentType<{ className?: string }>> = {
  info: Info,
  success: CheckCheck,
  warning: AlertTriangle,
  error: AlertTriangle,
  project_update: FileText,
  issue_update: AlertTriangle,
  invoice_update: ReceiptIndianRupee,
};

const TYPE_COLORS: Record<NotificationType, string> = {
  info: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  success: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  warning: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  error: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
  project_update: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  issue_update: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
  invoice_update: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
};

export function NotificationBell({
  initialCount = 0,
  userId,
}: {
  initialCount?: number;
  userId?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const preferAdmin = Boolean(pathname?.startsWith("/admin"));

  const [count, setCount] = useState(initialCount);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notification[] | null>(null);
  // Items unread when the dropdown opened keep their highlight after mark-all-read.
  const [freshIds, setFreshIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  const refreshCount = useCallback(async () => {
    try {
      setCount(await getUnreadNotificationCount());
    } catch {
      // Keep last known count
    }
  }, []);

  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      const list = await getNotifications(DROPDOWN_LIMIT);
      setItems(list);
      const unread = list.filter((n) => !n.is_read);
      if (unread.length > 0) {
        setFreshIds(new Set(unread.map((n) => n.id)));
        await markAllNotificationsRead();
        setItems(list.map((n) => (n.is_read ? n : { ...n, is_read: true })));
      }
      setCount(0);
    } catch {
      setItems((prev) => prev ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setCount(initialCount);
  }, [initialCount]);

  const onRealtime = useCallback(() => {
    if (open) void loadItems();
    else void refreshCount();
  }, [open, loadItems, refreshCount]);

  useNotificationRealtime(userId, onRealtime);

  useEffect(() => {
    void refreshCount();
    const interval = window.setInterval(refreshCount, 120_000);
    return () => window.clearInterval(interval);
  }, [refreshCount]);

  useEffect(() => {
    function onChanged() {
      void refreshCount();
    }
    window.addEventListener(NOTIFICATIONS_CHANGED_EVENT, onChanged);
    return () => window.removeEventListener(NOTIFICATIONS_CHANGED_EVENT, onChanged);
  }, [refreshCount]);

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      setFreshIds(new Set());
      void loadItems();
    }
  }

  return (
    <DropdownMenu open={open} onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative text-slate-500"
          aria-label={count > 0 ? `Notifications, ${count} unread` : "Notifications"}
        >
          <Bell className="h-[18px] w-[18px]" />
          {count > 0 && (
            <span className="absolute right-1 top-1 flex min-h-[18px] min-w-[18px] items-center justify-center rounded-full bg-brand-accent px-1 text-[10px] font-bold text-white ring-2 ring-white dark:ring-slate-900">
              {count > 9 ? "9+" : count}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={8}
        collisionPadding={12}
        className="w-[min(24rem,calc(100vw-1.5rem))] p-0"
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-slate-800">
          <p className="text-sm font-semibold text-slate-900 dark:text-white">Notifications</p>
          {loading && <Loader2 className="h-4 w-4 animate-spin text-slate-400" />}
        </div>

        <div className="max-h-[min(28rem,70dvh)] overflow-y-auto overscroll-contain">
          {items === null ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center px-6 py-10 text-center">
              <Bell className="mb-2 h-8 w-8 text-slate-300" />
              <p className="text-sm font-medium text-slate-900 dark:text-white">No notifications</p>
              <p className="mt-1 text-xs text-slate-500">
                Alerts for uploads, issues, and billing will appear here.
              </p>
            </div>
          ) : (
            items.map((notification) => {
              const Icon = TYPE_ICONS[notification.type] ?? Info;
              const href = resolveNotificationHref(
                notification.link,
                {
                  title: notification.title,
                  message: notification.message,
                  type: notification.type,
                },
                { preferAdmin }
              );
              const isFresh = freshIds.has(notification.id);
              return (
                <DropdownMenuItem
                  key={notification.id}
                  onSelect={(e) => {
                    if (!href) {
                      e.preventDefault();
                      return;
                    }
                    router.push(href);
                  }}
                  className={cn(
                    "items-start gap-3 rounded-none border-b border-slate-100 px-4 py-3 last:border-b-0 dark:border-slate-800",
                    href ? "cursor-pointer" : "cursor-default",
                    isFresh && "bg-brand-accent/6"
                  )}
                >
                  <span
                    className={cn(
                      "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                      TYPE_COLORS[notification.type] ?? TYPE_COLORS.info
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-start gap-2">
                      <span className="min-w-0 flex-1 text-sm font-medium leading-snug text-slate-900 dark:text-white">
                        {notification.title}
                      </span>
                      {isFresh && (
                        <span
                          className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-accent"
                          aria-label="New"
                        />
                      )}
                    </span>
                    <span className="mt-0.5 line-clamp-2 block text-xs text-slate-600 dark:text-slate-400">
                      {notification.message}
                    </span>
                    <span className="mt-1 block text-[11px] text-slate-400">
                      {formatRelativeTime(notification.created_at)}
                    </span>
                  </span>
                </DropdownMenuItem>
              );
            })
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
