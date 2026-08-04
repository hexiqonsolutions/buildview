"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ReportPipelineStage } from "@/lib/reports/queries";
import { money } from "@/lib/reports/schema";
import { cn } from "@/lib/utils";

type ReportsPipelineProps = {
  stages: ReportPipelineStage[];
};

export function ReportsPipeline({ stages }: ReportsPipelineProps) {
  const reduceMotion = useReducedMotion();
  const total = stages.reduce((sum, stage) => sum + stage.count, 0);
  const max = Math.max(...stages.map((s) => s.count), 1);

  return (
    <section className="flex h-full flex-col rounded-2xl border border-zinc-800/80 bg-[#121212] p-5 md:p-6">
      <div className="mb-5">
        <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold text-white">
          Pipeline funnel
        </h2>
        <p className="mt-1 text-sm text-zinc-500">
          Current stage distribution · {total} leads
        </p>
      </div>

      {total === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-zinc-800 bg-zinc-950/40 px-6 py-12 text-center">
          <p className="text-sm font-medium text-zinc-300">No pipeline data</p>
          <p className="mt-1 max-w-sm text-sm text-zinc-500">
            Add leads to see New → Won / Lost conversion.
          </p>
        </div>
      ) : (
        <ul className="flex flex-1 flex-col justify-center gap-3">
          {stages.map((stage, index) => (
            <li key={stage.status} className="space-y-1.5">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="text-zinc-300">{stage.label}</span>
                <span className="tabular-nums text-zinc-400">
                  {stage.count} · {stage.percent}%
                  {stage.value > 0 ? (
                    <span className="text-zinc-600"> · {money(stage.value)}</span>
                  ) : null}
                </span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-zinc-900">
                <motion.div
                  className={cn(
                    "h-full rounded-full",
                    stage.status === "WON"
                      ? "bg-emerald-500/80"
                      : stage.status === "LOST"
                        ? "bg-red-500/70"
                        : "bg-gradient-to-r from-orange-500/70 to-orange-400"
                  )}
                  initial={reduceMotion ? false : { width: 0 }}
                  animate={{ width: `${(stage.count / max) * 100}%` }}
                  transition={{
                    duration: 0.5,
                    delay: reduceMotion ? 0 : 0.06 + index * 0.04,
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
