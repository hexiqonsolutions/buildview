import { Camera, FileText, FolderOpen, AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface ProjectOverviewProps {
  tourCount: number;
  reportCount: number;
  documentCount: number;
  openIssueCount: number;
}

const stats = [
  {
    key: "tours",
    label: "Virtual Tours",
    icon: Camera,
    iconClass: "bg-brand-accent/15 text-brand-accent",
  },
  {
    key: "reports",
    label: "Reports",
    icon: FileText,
    iconClass: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  },
  {
    key: "documents",
    label: "Documents",
    icon: FolderOpen,
    iconClass: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  },
  {
    key: "issues",
    label: "Open Issues",
    icon: AlertTriangle,
    iconClass: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  },
] as const;

export function ProjectOverview({
  tourCount,
  reportCount,
  documentCount,
  openIssueCount,
}: ProjectOverviewProps) {
  const values = {
    tours: tourCount,
    reports: reportCount,
    documents: documentCount,
    issues: openIssueCount,
  };

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {stats.map((stat) => (
        <Card
          key={stat.key}
          className="portal-card border-0 text-center shadow-none transition-transform hover:-translate-y-0.5"
        >
          <CardContent className="p-6">
            <div
              className={cn(
                "mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl",
                stat.iconClass
              )}
            >
              <stat.icon className="h-5 w-5" />
            </div>
            <p className="font-display text-3xl font-bold text-brand-primary dark:text-white">
              {values[stat.key]}
            </p>
            <p className="mt-1 text-sm text-slate-500">{stat.label}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
