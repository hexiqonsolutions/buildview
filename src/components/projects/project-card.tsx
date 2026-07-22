import Link from "next/link";
import { MapPin, Calendar } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatStatus, getStatusColor } from "@/lib/utils";
import type { Project } from "@/lib/types";
import { PORTFOLIO_CATEGORY_LABELS } from "@/lib/types";

export function ProjectCard({ project }: { project: Project }) {
  return (
    <Link href={`/dashboard/projects/${project.id}`}>
      <Card className="intel-card dashboard-card-hover overflow-hidden border-0 group cursor-pointer">
        <div className="h-40 bg-gradient-to-br from-brand-primary to-brand-secondary flex items-center justify-center relative">
          {project.cover_image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={project.cover_image_url}
              alt={project.name}
              className="absolute inset-0 w-full h-full object-cover"
            />
          ) : (
            <span className="text-5xl font-bold text-white/20">{project.name.charAt(0)}</span>
          )}
          <div className="absolute top-3 right-3">
            <Badge className={getStatusColor(project.status)}>
              {formatStatus(project.status)}
            </Badge>
          </div>
        </div>
        <CardContent className="p-5">
          <h3 className="font-display text-base font-semibold text-brand-primary transition-colors group-hover:text-brand-accent-dark dark:text-white">
            {project.name}
          </h3>
          <p className="text-sm text-slate-500 mt-1">{project.client_name}</p>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 mt-3 text-xs text-slate-500">
            <span className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" /> {project.location}
            </span>
            {project.area_sqft != null && project.area_sqft > 0 && (
              <span>{project.area_sqft.toLocaleString("en-US")} sq ft</span>
            )}
            {project.portfolio_category && (
              <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                {PORTFOLIO_CATEGORY_LABELS[project.portfolio_category]}
              </span>
            )}
            {project.start_date && (
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" /> {formatDate(project.start_date)}
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
