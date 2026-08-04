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
import type { ReportTrendPoint } from "@/lib/reports/queries";

type ReportsTrendChartProps = {
  data: ReportTrendPoint[];
  rangeLabel: string;
};

function hasSignal(data: ReportTrendPoint[]) {
  return data.some(
    (point) => point.leads > 0 || point.won > 0 || point.revenue > 0
  );
}

export function ReportsTrendChart({
  data,
  rangeLabel,
}: ReportsTrendChartProps) {
  const active = hasSignal(data);

  return (
    <section className="flex h-full flex-col rounded-2xl border border-zinc-800/80 bg-[#121212] p-5 md:p-6">
      <div className="mb-5">
        <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold text-white">
          Leads & wins trend
        </h2>
        <p className="mt-1 text-sm text-zinc-500">
          {rangeLabel} · created leads, wins, expected revenue
        </p>
      </div>

      {!active ? (
        <div className="flex flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-zinc-800 bg-zinc-950/40 px-6 py-12 text-center">
          <p className="text-sm font-medium text-zinc-300">No trend data</p>
          <p className="mt-1 max-w-sm text-sm text-zinc-500">
            Charts fill in as leads are created and deals are won.
          </p>
        </div>
      ) : (
        <div className="min-h-[280px] flex-1">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="reportLeadFill" x1="0" y1="0" x2="0" y2="1">
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
                yAxisId="count"
                allowDecimals={false}
                tick={{ fill: "#71717A", fontSize: 12 }}
                axisLine={false}
                tickLine={false}
                width={28}
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
                yAxisId="count"
                type="monotone"
                dataKey="leads"
                name="Leads"
                stroke="#F97316"
                strokeWidth={2}
                fill="url(#reportLeadFill)"
                dot={false}
              />
              <Area
                yAxisId="count"
                type="monotone"
                dataKey="won"
                name="Won"
                stroke="#22C55E"
                strokeWidth={2}
                fill="transparent"
                dot={false}
              />
              <Area
                yAxisId="revenue"
                type="monotone"
                dataKey="revenue"
                name="Expected revenue"
                stroke="#A1A1AA"
                strokeWidth={1.5}
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
