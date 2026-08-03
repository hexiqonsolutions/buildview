"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatStatus } from "@/lib/utils";

const COLORS = ["#A4CF30", "#76B82D", "#050505", "#94A3B8", "#64748B"];

interface BarChartItem {
  label: string;
  value: number;
}

export function AdminBarChart({
  title,
  data,
  emptyMessage = "No data yet",
  formatValue,
  /** When true, bar widths use max value (trends) instead of share-of-total. */
  scaleToMax = false,
}: {
  title: string;
  data: BarChartItem[];
  emptyMessage?: string;
  formatValue?: (value: number) => string;
  scaleToMax?: boolean;
}) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const max = Math.max(...data.map((d) => d.value), 0);

  return (
    <Card className="admin-card border-0 shadow-none">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-slate-900 dark:text-white">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {total === 0 ? (
          <p className="py-8 text-center text-sm text-slate-500">{emptyMessage}</p>
        ) : (
          <div className="space-y-3">
            {data.map((item, i) => {
              const widthPct = scaleToMax
                ? max > 0
                  ? (item.value / max) * 100
                  : 0
                : (item.value / total) * 100;
              return (
                <div key={`${item.label}-${i}`}>
                  <div className="mb-1 flex justify-between gap-2 text-xs">
                    <span className="truncate text-slate-600 dark:text-slate-400">
                      {item.label}
                    </span>
                    <span className="shrink-0 font-medium text-slate-900 dark:text-white">
                      {formatValue ? formatValue(item.value) : item.value}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${widthPct}%`,
                        backgroundColor: COLORS[i % COLORS.length],
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function AdminStatusChart({
  title,
  data,
}: {
  title: string;
  data: { status: string; count: number }[];
}) {
  return (
    <AdminBarChart
      title={title}
      data={data.map((d) => ({ label: formatStatus(d.status), value: d.count }))}
    />
  );
}
