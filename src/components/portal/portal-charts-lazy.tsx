"use client";

import dynamic from "next/dynamic";

const chartFallback = (
  <div className="flex h-48 items-center justify-center rounded-xl bg-slate-50 text-sm text-slate-400 dark:bg-slate-900/50">
    Loading chart…
  </div>
);

export const PortalOverallProgressDonut = dynamic(
  () =>
    import("@/components/portal/portal-charts").then(
      (mod) => mod.PortalOverallProgressDonut
    ),
  { ssr: false, loading: () => chartFallback }
);

export const PortalProgressTrendChart = dynamic(
  () =>
    import("@/components/portal/portal-charts").then(
      (mod) => mod.PortalProgressTrendChart
    ),
  { ssr: false, loading: () => chartFallback }
);
