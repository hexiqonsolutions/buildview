"use client";

import {
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const COLORS = ["#A4CF30", "#76B82D", "#0F172A", "#94A3B8"];
const CHART_HEIGHT = 200;

type ProgressDistributionItem = {
  name: string;
  value: number;
  percent: number;
};

interface PortalOverallProgressDonutProps {
  overallPercent: number;
  distribution: ProgressDistributionItem[];
}

export function PortalOverallProgressDonut({
  overallPercent,
  distribution,
}: PortalOverallProgressDonutProps) {
  const chartData = distribution.filter((d) => d.value > 0);
  const hasData = chartData.length > 0;

  return (
    <div className="intel-card relative z-0 isolate overflow-hidden p-4 sm:p-5">
      <h3 className="font-display text-base font-semibold text-slate-900 dark:text-white">
        Overall Progress
      </h3>
      <div
        className="relative mx-auto mt-3 w-full max-w-[220px] shrink-0 overflow-hidden"
        style={{ height: CHART_HEIGHT }}
      >
        {hasData ? (
          <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={58}
                outerRadius={78}
                paddingAngle={2}
                dataKey="value"
                stroke="none"
              >
                {chartData.map((entry, index) => (
                  <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number, name: string) => [
                  `${value} project${value === 1 ? "" : "s"}`,
                  name,
                ]}
              />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center rounded-full border-8 border-slate-100 dark:border-slate-800" />
        )}
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display text-3xl font-bold text-slate-900 dark:text-white">
            {overallPercent}%
          </span>
          <span className="text-xs text-slate-500">Complete</span>
        </div>
      </div>
      <div className="mt-4 space-y-2">
        {distribution.map((entry, index) => (
          <div key={entry.name} className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <div
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: COLORS[index % COLORS.length] }}
              />
              <span className="text-slate-600 dark:text-slate-400">{entry.name}</span>
            </div>
            <span className="font-medium text-slate-900 dark:text-white">{entry.percent}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

interface PortalProgressTrendChartProps {
  data: { month: string; progress: number }[];
}

export function PortalProgressTrendChart({ data }: PortalProgressTrendChartProps) {
  return (
    <div className="intel-card relative z-0 isolate overflow-hidden p-4 sm:p-5">
      <h3 className="font-display text-base font-semibold text-slate-900 dark:text-white">
        Progress Trend
      </h3>
      <div className="mt-3 w-full shrink-0 overflow-hidden" style={{ height: CHART_HEIGHT }}>
        <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
          <LineChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
            <XAxis
              dataKey="month"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: "#94A3B8" }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: "#94A3B8" }}
              domain={[0, 100]}
              tickFormatter={(v) => `${v}%`}
            />
            <Tooltip
              formatter={(value: number) => [`${value}%`, "Progress"]}
              contentStyle={{
                borderRadius: "8px",
                border: "1px solid #e2e8f0",
                fontSize: "12px",
              }}
            />
            <Line
              type="monotone"
              dataKey="progress"
              stroke="#A4CF30"
              strokeWidth={2.5}
              dot={{ r: 3, fill: "#A4CF30", strokeWidth: 0 }}
              activeDot={{ r: 5, fill: "#76B82D" }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
