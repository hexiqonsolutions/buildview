"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell } from "lucide-react";
import { getUnreadNotificationCount } from "@/lib/actions/notifications";
import { useNotificationRealtime } from "@/hooks/use-notification-realtime";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const NOTIFICATIONS_CHANGED_EVENT = "buildview:notifications-changed";

export function notifyNotificationsChanged() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(NOTIFICATIONS_CHANGED_EVENT));
  }
}

export function NotificationBell({
  initialCount = 0,
  userId,
  href = "/admin/notifications",
}: {
  initialCount?: number;
  userId?: string;
  href?: string;
}) {
  const pathname = usePathname();
  const [count, setCount] = useState(initialCount);

  const refresh = useCallback(async () => {
    try {
      const next = await getUnreadNotificationCount();
      setCount(next);
    } catch {
      // Keep last known count
    }
  }, []);

  useEffect(() => {
    setCount(initialCount);
  }, [initialCount]);

  useNotificationRealtime(userId, refresh);

  useEffect(() => {
    refresh();
    const interval = window.setInterval(refresh, 120_000);
    return () => window.clearInterval(interval);
  }, [refresh]);

  // Clear / refresh badge when opening the inbox.
  useEffect(() => {
    if (pathname?.includes("/notifications")) {
      setCount(0);
      void refresh();
    }
  }, [pathname, refresh]);

  useEffect(() => {
    function onChanged() {
      void refresh();
    }
    window.addEventListener(NOTIFICATIONS_CHANGED_EVENT, onChanged);
    return () => window.removeEventListener(NOTIFICATIONS_CHANGED_EVENT, onChanged);
  }, [refresh]);

  return (
    <Button variant="ghost" size="icon" className="relative text-slate-500" asChild>
      <Link href={href} aria-label="Notifications">
        <Bell className="h-[18px] w-[18px]" />
        {count > 0 && (
          <span
            className={cn(
              "absolute right-1 top-1 flex min-h-[18px] min-w-[18px] items-center justify-center rounded-full bg-brand-accent px-1 text-[10px] font-bold text-white ring-2 ring-white dark:ring-slate-900"
            )}
          >
            {count > 9 ? "9+" : count}
          </span>
        )}
      </Link>
    </Button>
  );
}
