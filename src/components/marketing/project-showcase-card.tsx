import Link from "next/link";
import { ArrowRight, Camera, FileText, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ProjectShowcaseCardProps {
  name: string;
  client: string;
  location: string;
  status: "In Progress" | "Completed" | "Planning";
  description: string;
  tours: number;
  reports: number;
  type: string;
  className?: string;
}

const statusStyles = {
  "In Progress": "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  Completed: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  Planning: "bg-sky-500/10 text-sky-700 dark:text-sky-400",
};

export function ProjectShowcaseCard({
  name,
  client,
  location,
  status,
  description,
  tours,
  reports,
  type,
  className,
}: ProjectShowcaseCardProps) {
  return (
    <article
      className={cn(
        "group surface-card overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-soft",
        className
      )}
    >
      <div className="relative flex h-52 items-end overflow-hidden bg-brand-primary p-6">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-accent/20 via-brand-primary to-brand-secondary" />
        <div className="dot-pattern absolute inset-0 opacity-20" />
        <div className="relative w-full">
          <Badge className={cn("mb-3 border-0", statusStyles[status])}>{status}</Badge>
          <p className="text-xs font-medium uppercase tracking-wider text-brand-accent">
            {type}
          </p>
          <h3 className="mt-1 font-display text-xl font-bold text-white">{name}</h3>
        </div>
      </div>
      <div className="p-6">
        <p className="text-sm font-medium text-slate-500">{client}</p>
        <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
          {description}
        </p>
        <div className="mt-4 flex items-center gap-1.5 text-sm text-slate-500">
          <MapPin className="h-4 w-4 shrink-0 text-brand-accent" />
          {location}
        </div>
        <div className="mt-5 flex items-center justify-between border-t border-slate-200/80 pt-5 dark:border-slate-800">
          <div className="flex gap-4 text-sm text-slate-500">
            <span className="flex items-center gap-1.5">
              <Camera className="h-4 w-4" /> {tours} tours
            </span>
            <span className="flex items-center gap-1.5">
              <FileText className="h-4 w-4" /> {reports} reports
            </span>
          </div>
          <Button variant="ghost" size="sm" className="text-brand-accent-dark" asChild>
            <Link href="/login">
              Portal <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </article>
  );
}
