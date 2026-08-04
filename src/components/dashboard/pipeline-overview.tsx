"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { PipelineStage } from "@/lib/dashboard/metrics";
import { cn } from "@/lib/utils";

type PipelineOverviewProps = {
  stages: PipelineStage[];
  totalLeads: number;
};

export function PipelineOverview({ stages, totalLeads }: PipelineOverviewProps) {
  const reduceMotion = useReducedMotion();
  const max = Math.max(...stages.map((s) => s.count), 1);

  return (
    <section className="flex h-full flex-col rounded-2xl border border-zinc-800/80 bg-[#121212] p-5 md:p-6">
      <div className="mb-5 flex items-end justify-between gap-3">
        <div>
          <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold text-white">
            Pipeline Overview
          </h2>
          <p className="mt-1 text-sm text-zinc-500">
            Stage distribution across active and won deals
          </p>
        </div>
        <p className="text-sm tabular-nums text-zinc-400">
          <span className="font-medium text-orange-300">{totalLeads}</span> total
        </p>
      </div>

      {totalLeads === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-zinc-800 bg-zinc-950/40 px-6 py-12 text-center">
          <p className="text-sm font-medium text-zinc-300">No pipeline data yet</p>
          <p className="mt-1 max-w-sm text-sm text-zinc-500">
            Add leads to see conversion across New → Won. Lead management unlocks in
            Module 3.
          </p>
        </div>
      ) : (
        <ul className="flex flex-1 flex-col justify-center gap-3.5">
          {stages.map((stage, index) => (
            <li key={stage.status} className="space-y-1.5">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="text-zinc-300">{stage.label}</span>
                <span className="tabular-nums text-zinc-400">
                  {stage.count}{" "}
                  <span className="text-zinc-600">· {stage.percent}%</span>
                </span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-zinc-900">
                <motion.div
                  className={cn(
                    "h-full rounded-full bg-gradient-to-r from-orange-500/70 to-orange-400"
                  )}
                  initial={reduceMotion ? false : { width: 0 }}
                  animate={{ width: `${(stage.count / max) * 100}%` }}
                  transition={{
                    duration: 0.55,
                    delay: reduceMotion ? 0 : 0.08 + index * 0.05,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
