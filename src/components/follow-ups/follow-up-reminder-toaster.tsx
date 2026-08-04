"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { fetchAndMarkRemindersAction } from "@/lib/follow-ups/actions";

export function FollowUpReminderToaster() {
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    void (async () => {
      const result = await fetchAndMarkRemindersAction();
      if (!result.ok || !result.data) return;

      const { overdue, today, items } = result.data;
      if (!items.length) return;

      const title =
        overdue > 0
          ? `${overdue} overdue follow-up${overdue === 1 ? "" : "s"}`
          : `${today} follow-up${today === 1 ? "" : "s"} due today`;

      toast.warning(title, {
        description: items
          .slice(0, 3)
          .map((item) => `${item.title} · ${item.leadLabel}`)
          .join(" · "),
        duration: 5000,
        action: {
          label: "Open",
          onClick: () => {
            window.location.href =
              overdue > 0 ? "/follow-ups?bucket=overdue" : "/follow-ups?bucket=today";
          },
        },
      });
    })();
  }, []);

  return (
    <span className="sr-only">
      Reminder listener active.{" "}
      <Link href="/follow-ups">Follow-ups</Link>
    </span>
  );
}
