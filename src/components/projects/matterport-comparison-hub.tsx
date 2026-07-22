"use client";

import { useMemo, useState } from "react";
import { Camera, Columns2 } from "lucide-react";
import { MatterportViewer } from "@/components/projects/MatterportViewer";
import { EmptyState } from "@/components/dashboard/empty-state";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";

type TourOption = {
  id: string;
  name: string;
  capture_date: string | null;
  matterport_url: string;
  project: { id: string; name: string; client_name: string } | null;
};

interface MatterportComparisonHubProps {
  tours: TourOption[];
}

function TourPanel({
  label,
  value,
  onChange,
  tours,
}: {
  label: string;
  value: string;
  onChange: (id: string) => void;
  tours: TourOption[];
}) {
  const selected = tours.find((t) => t.id === value) ?? null;

  return (
    <Card className="portal-card border-0 shadow-none">
      <CardHeader>
        <CardTitle className="text-base">{label}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger>
            <SelectValue placeholder="Select a tour" />
          </SelectTrigger>
          <SelectContent>
            {tours.map((tour) => (
              <SelectItem key={tour.id} value={tour.id}>
                {tour.project?.name ? `${tour.project.name} — ${tour.name}` : tour.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {selected && (
          <>
            <div className="text-xs text-slate-500">
              <span className="font-medium text-slate-700 dark:text-slate-200">
                {selected.project?.name ?? "Unknown project"}
              </span>
              {selected.capture_date && ` · Captured ${formatDate(selected.capture_date)}`}
            </div>
            <MatterportViewer url={selected.matterport_url} title={selected.name} />
          </>
        )}
      </CardContent>
    </Card>
  );
}

export function MatterportComparisonHub({ tours }: MatterportComparisonHubProps) {
  const [left, setLeft] = useState(tours[0]?.id ?? "");
  const [right, setRight] = useState(tours[1]?.id ?? tours[0]?.id ?? "");

  const hasTours = tours.length > 0;
  const hasEnoughForComparison = tours.length > 1;

  const headerDescription = useMemo(() => {
    if (!hasTours) return "No tours available yet.";
    if (!hasEnoughForComparison) return "Add one more tour to compare side-by-side.";
    return "Compare any two Matterport captures from your assigned projects.";
  }, [hasTours, hasEnoughForComparison]);

  if (!hasTours) {
    return (
      <EmptyState
        icon={Camera}
        title="No Matterport tours available"
        description="Your admin can upload tours to your projects. They will appear here automatically."
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="portal-card flex items-center gap-3 p-4">
        <div className="rounded-lg bg-brand-accent/10 p-2">
          <Columns2 className="h-5 w-5 text-brand-accent-dark" />
        </div>
        <div>
          <p className="font-medium text-brand-primary dark:text-white">Matterport Comparison</p>
          <p className="text-sm text-slate-500">{headerDescription}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <TourPanel label="Tour A" value={left} onChange={setLeft} tours={tours} />
        <TourPanel label="Tour B" value={right} onChange={setRight} tours={tours} />
      </div>
    </div>
  );
}
