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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const COLORS = ["#A4CF30", "#76B82D", "#0F172A", "#94A3B8"];

export type ProgressDistributionItem = {
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
    <Card className="portal-card border-0 shadow-none">
      <CardHeader className="pb-2">
        <CardTitle className="font-display text-base font-semibold">Overall Progress</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative mx-auto h-[200px] w-full max-w-[220px]">
          {hasData ? (
            <ResponsiveContainer width="100%" height="100%">
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
                  formatter={(value: number, name: string) => [`${value} project${value === 1 ? "" : "s"}`, name]}
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
      </CardContent>
    </Card>
  );
}

interface PortalProgressTrendChartProps {
  data: { month: string; progress: number }[];
}

export function PortalProgressTrendChart({ data }: PortalProgressTrendChartProps) {
  return (
    <Card className="portal-card border-0 shadow-none">
      <CardHeader className="pb-2">
        <CardTitle className="font-display text-base font-semibold">Progress Trend</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[200px] w-full">
          <ResponsiveContainer width="100%" height="100%">
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
      </CardContent>
    </Card>
  );
}
