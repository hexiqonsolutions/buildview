import { Calendar, User, Building2, Layers, FileText } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { getTourDisplayFields } from "@/lib/comparison/metadata";
import type { ProjectTour } from "@/lib/types";

export function MatterportMetadataGrid({ tour }: { tour: ProjectTour }) {
  const meta = getTourDisplayFields(tour);
  const items = [
    tour.capture_date && {
      icon: Calendar,
      label: "Capture Date",
      value: formatDate(tour.capture_date),
    },
    meta.engineer && { icon: User, label: "Engineer", value: meta.engineer },
    meta.building && { icon: Building2, label: "Building", value: meta.building },
    meta.floor && { icon: Layers, label: "Floor", value: meta.floor },
  ].filter(Boolean) as Array<{ icon: typeof Calendar; label: string; value: string }>;

  if (items.length === 0) return null;

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800/50"
        >
          <p className="flex items-center gap-1.5 text-xs text-slate-500">
            <item.icon className="h-3.5 w-3.5" /> {item.label}
          </p>
          <p className="mt-1 text-sm font-medium text-slate-900 dark:text-white">{item.value}</p>
        </div>
      ))}
    </div>
  );
}

export function MatterportNotes({ tour }: { tour: ProjectTour }) {
  const notes = getTourDisplayFields(tour).notes;
  if (!notes) return null;

  return (
    <div className="rounded-lg border border-slate-100 p-3 dark:border-slate-800">
      <p className="flex items-center gap-1.5 text-xs text-slate-500">
        <FileText className="h-3.5 w-3.5" /> Engineer notes
      </p>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{notes}</p>
    </div>
  );
}
