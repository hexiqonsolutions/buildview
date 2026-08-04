"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { TrendPoint } from "@/lib/dashboard/metrics";

type RevenueTrendChartProps = {
  data: TrendPoint[];
};

function hasSignal(data: TrendPoint[]) {
  return data.some((point) => point.leads > 0 || point.revenue > 0);
}

export function RevenueTrendChart({ data }: RevenueTrendChartProps) {
  const active = hasSignal(data);

  return (
    <section className="flex h-full flex-col rounded-2xl border border-zinc-800/80 bg-[#121212] p-5 md:p-6">
      <div className="mb-5">
        <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold text-white">
          Leads & Revenue Trend
        </h2>
        <p className="mt-1 text-sm text-zinc-500">Last 14 days · expected revenue on new leads</p>
      </div>

      {!active ? (
        <div className="flex flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-zinc-800 bg-zinc-950/40 px-6 py-12 text-center">
          <p className="text-sm font-medium text-zinc-300">No trend data yet</p>
          <p className="mt-1 max-w-sm text-sm text-zinc-500">
            Charts populate as leads and expected revenue are recorded.
          </p>
        </div>
      ) : (
        <div className="min-h-[260px] flex-1">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="leadFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#F97316" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#F97316" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fill: "#71717A", fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                yAxisId="leads"
                tick={{ fill: "#71717A", fontSize: 12 }}
                axisLine={false}
                tickLine={false}
                width={28}
                allowDecimals={false}
              />
              <YAxis
                yAxisId="revenue"
                orientation="right"
                tick={{ fill: "#71717A", fontSize: 12 }}
                axisLine={false}
                tickLine={false}
                width={48}
                tickFormatter={(value) =>
                  value >= 1000 ? `${Math.round(value / 1000)}k` : String(value)
                }
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
              <Area
                yAxisId="leads"
                type="monotone"
                dataKey="leads"
                name="Leads"
                stroke="#F97316"
                strokeWidth={2}
                fill="url(#leadFill)"
                dot={false}
                activeDot={{ r: 4, fill: "#F97316" }}
              />
              <Area
                yAxisId="revenue"
                type="monotone"
                dataKey="revenue"
                name="Expected revenue"
                stroke="#22C55E"
                strokeWidth={2}
                strokeDasharray="5 4"
                fill="transparent"
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}
