"use client";

import { useState } from "react";
import { Columns2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MatterportViewer } from "@/components/projects/MatterportViewer";
import { formatDate } from "@/lib/utils";
import type { ProjectTour } from "@/lib/types";

interface MatterportCompareProps {
  tours: ProjectTour[];
  onClose: () => void;
}

function TourPicker({
  tours,
  value,
  onChange,
  label,
}: {
  tours: ProjectTour[];
  value: string;
  onChange: (id: string) => void;
  label: string;
}) {
  const selected = tours.find((t) => t.id === value);

  return (
    <div className="space-y-2">
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="bg-white dark:bg-slate-900">
          <SelectValue placeholder={label} />
        </SelectTrigger>
        <SelectContent>
          {tours.map((tour) => (
            <SelectItem key={tour.id} value={tour.id}>
              {tour.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {selected && (
        <>
          <MatterportViewer url={selected.matterport_url} title={selected.name} />
          {selected.capture_date && (
            <p className="text-xs text-slate-400">
              Captured {formatDate(selected.capture_date)}
            </p>
          )}
        </>
      )}
    </div>
  );
}

export function MatterportCompare({ tours, onClose }: MatterportCompareProps) {
  const [leftId, setLeftId] = useState(tours[0]?.id ?? "");
  const [rightId, setRightId] = useState(tours[1]?.id ?? tours[0]?.id ?? "");

  return (
    <div className="surface-card space-y-4 p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Columns2 className="h-4 w-4 text-brand-accent" />
          <h3 className="font-display text-sm font-semibold text-brand-primary dark:text-white">
            Compare Virtual Tours
          </h3>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="mr-1 h-4 w-4" /> Close
        </Button>
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <TourPicker tours={tours} value={leftId} onChange={setLeftId} label="Select first tour" />
        <TourPicker tours={tours} value={rightId} onChange={setRightId} label="Select second tour" />
      </div>
    </div>
  );
}
