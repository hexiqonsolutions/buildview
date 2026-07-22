import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatStatus } from "@/lib/utils";

const COLORS = ["#A4CF30", "#76B82D", "#050505", "#94A3B8"];

interface ProjectsByStatusChartProps {
  data: { status: string; count: number }[];
}

export function ProjectsByStatusChart({ data }: ProjectsByStatusChartProps) {
  const chartData =
    data.length > 0
      ? data.map((d) => ({
          name: formatStatus(d.status),
          value: d.count,
        }))
      : [{ name: "No projects yet", value: 0 }];

  const total = chartData.reduce((sum, item) => sum + item.value, 0) || 1;

  return (
    <Card className="surface-card border-0">
      <CardHeader className="pb-2">
        <CardTitle className="font-display text-base font-semibold">
          Projects by Status
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex h-4 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
          {chartData.map((entry, index) =>
            entry.value > 0 ? (
              <div
                key={entry.name}
                className="h-full transition-all"
                style={{
                  width: `${(entry.value / total) * 100}%`,
                  backgroundColor: COLORS[index % COLORS.length],
                }}
                title={`${entry.name}: ${entry.value}`}
              />
            ) : null
          )}
        </div>
        <div className="flex flex-wrap gap-4">
          {chartData.map((entry, index) => (
            <div key={entry.name} className="flex items-center gap-2 text-sm">
              <div
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: COLORS[index % COLORS.length] }}
              />
              <span className="text-slate-600 dark:text-slate-400">
                {entry.name} ({entry.value})
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

interface MonthlyActivityChartProps {
  data: { month: string; count: number }[];
}

export function MonthlyActivityChart({ data }: MonthlyActivityChartProps) {
  const maxCount = Math.max(...data.map((d) => d.count), 1);

  return (
    <Card className="surface-card border-0">
      <CardHeader className="pb-2">
        <CardTitle className="font-display text-base font-semibold">
          Monthly Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex h-[250px] items-end justify-between gap-2">
          {data.map((entry) => (
            <div
              key={entry.month}
              className="flex min-w-0 flex-1 flex-col items-center gap-2"
            >
              <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                {entry.count}
              </span>
              <div
                className="w-full max-w-10 rounded-t-md bg-brand-accent transition-all"
                style={{
                  height: `${Math.max((entry.count / maxCount) * 180, entry.count > 0 ? 8 : 4)}px`,
                }}
              />
              <span className="text-xs text-slate-500">{entry.month}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
