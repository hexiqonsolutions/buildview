"use client";

import { motion, useReducedMotion } from "framer-motion";
import {
  Mail,
  UserPlus,
  CalendarClock,
  Calendar,
  CircleDollarSign,
  BriefcaseBusiness,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { DashboardKpi } from "@/lib/dashboard/metrics";

const ICONS: Record<string, LucideIcon> = {
  emails: Mail,
  leads: UserPlus,
  followups: CalendarClock,
  meetings: Calendar,
  revenue: CircleDollarSign,
  opportunities: BriefcaseBusiness,
};

const TONE: Record<NonNullable<DashboardKpi["tone"]>, string> = {
  default: "text-orange-400",
  warning: "text-amber-400",
  danger: "text-red-400",
  success: "text-emerald-400",
};

type KpiGridProps = {
  items: DashboardKpi[];
};

export function KpiGrid({ items }: KpiGridProps) {
  const reduceMotion = useReducedMotion();

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
      {items.map((item, index) => {
        const Icon = ICONS[item.id] ?? BriefcaseBusiness;
        return (
          <motion.article
            key={item.id}
            initial={reduceMotion ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.35,
              delay: reduceMotion ? 0 : index * 0.05,
              ease: [0.22, 1, 0.36, 1],
            }}
            className="group rounded-2xl border border-zinc-800/80 bg-[#121212] p-5 shadow-[0_18px_40px_-28px_rgba(0,0,0,0.9)] transition-colors duration-200 hover:border-orange-500/30"
          >
            <div className="flex items-start justify-between gap-3">
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-500">
                {item.label}
              </p>
              <span
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-950/80",
                  TONE[item.tone ?? "default"]
                )}
              >
                <Icon className="size-4" aria-hidden />
              </span>
            </div>
            <p className="mt-4 font-[family-name:var(--font-display)] text-3xl font-semibold tabular-nums tracking-tight text-white">
              {item.value}
            </p>
            <p
              className={cn(
                "mt-2 text-sm",
                item.tone === "danger"
                  ? "text-red-300"
                  : item.tone === "warning"
                    ? "text-amber-300/90"
                    : "text-zinc-500"
              )}
            >
              {item.helper}
            </p>
          </motion.article>
        );
      })}
    </div>
  );
}
