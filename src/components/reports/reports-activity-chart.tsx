"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ReportActivitySlice } from "@/lib/reports/queries";

type ReportsActivityChartProps = {
  data: ReportActivitySlice[];
};

export function ReportsActivityChart({ data }: ReportsActivityChartProps) {
  const total = data.reduce((sum, row) => sum + row.count, 0);

  return (
    <section className="flex h-full flex-col rounded-2xl border border-zinc-800/80 bg-[#121212] p-5 md:p-6">
      <div className="mb-5">
        <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold text-white">
          Activity mix
        </h2>
        <p className="mt-1 text-sm text-zinc-500">
          {total} events in selected range
        </p>
      </div>

      {total === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-zinc-800 bg-zinc-950/40 px-6 py-12 text-center">
          <p className="text-sm font-medium text-zinc-300">No activities yet</p>
          <p className="mt-1 max-w-sm text-sm text-zinc-500">
            Calls, meetings, emails, tasks, and notes will appear here.
          </p>
        </div>
      ) : (
        <div className="min-h-[260px] flex-1">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fill: "#71717A", fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fill: "#71717A", fontSize: 12 }}
                axisLine={false}
                tickLine={false}
                width={28}
              />
              <Tooltip
                contentStyle={{
                  background: "#0A0A0A",
                  border: "1px solid #27272A",
                  borderRadius: 12,
                  color: "#FAFAFA",
                }}
                labelStyle={{ color: "#A1A1AA" }}
              />
              <Bar
                dataKey="count"
                name="Count"
                fill="#F97316"
                radius={[8, 8, 0, 0]}
                maxBarSize={48}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}
