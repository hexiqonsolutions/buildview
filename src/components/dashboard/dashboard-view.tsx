"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { DashboardData } from "@/lib/dashboard/metrics";
import { KpiGrid } from "@/components/dashboard/kpi-grid";
import { PipelineOverview } from "@/components/dashboard/pipeline-overview";
import { RevenueTrendChart } from "@/components/dashboard/revenue-trend-chart";
import { UpcomingFollowUps } from "@/components/dashboard/upcoming-follow-ups";
import { RecentActivities } from "@/components/dashboard/recent-activities";

type DashboardViewProps = {
  organizationName: string;
  data: DashboardData;
};

export function DashboardView({ organizationName, data }: DashboardViewProps) {
  const reduceMotion = useReducedMotion();

  return (
    <div className="mx-auto max-w-[1400px] space-y-5 p-5 md:space-y-6 md:p-7">
      <motion.div
        initial={reduceMotion ? false : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="rounded-2xl border border-orange-500/20 bg-gradient-to-br from-orange-500/[0.12] via-[#121212] to-[#0A0A0A] px-5 py-5 md:px-6"
      >
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-orange-300/90">
          Sales command center
        </p>
        <h2 className="mt-2 font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight text-white md:text-3xl">
          {organizationName}
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-400">
          Track today&apos;s emails, new leads, follow-ups, meetings, pipeline value,
          and open opportunities in one dense surface.
        </p>
      </motion.div>

      <KpiGrid items={data.kpis} />

      <div className="grid gap-4 lg:grid-cols-2 lg:gap-5">
        <div className="min-h-[340px]">
          <PipelineOverview
            stages={data.pipeline}
            totalLeads={data.totals.leads}
          />
        </div>
        <div className="min-h-[340px]">
          <RevenueTrendChart data={data.trend} />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2 lg:gap-5">
        <div className="min-h-[320px]">
          <UpcomingFollowUps items={data.followUps} />
        </div>
        <div className="min-h-[320px]">
          <RecentActivities items={data.activities} />
        </div>
      </div>
    </div>
  );
}
