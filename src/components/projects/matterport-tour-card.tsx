"use client";

import { useState } from "react";
import { Camera, Calendar, ExternalLink } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MatterportViewer } from "@/components/projects/MatterportViewer";
import { formatDate } from "@/lib/utils";
import { getMatterportShareUrl } from "@/lib/matterport";
import type { ProjectTour } from "@/lib/types";

export function MatterportTourCard({ tour }: { tour: ProjectTour }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Card className="glass-card group overflow-hidden border-0 transition-shadow hover:shadow-lg">
        <div
          className="relative flex h-48 cursor-pointer items-center justify-center bg-gradient-to-br from-brand-primary to-brand-secondary"
          onClick={() => setOpen(true)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === "Enter" && setOpen(true)}
          aria-label={`View ${tour.name} virtual tour`}
        >
          {tour.thumbnail_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={tour.thumbnail_url}
              alt={tour.name}
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 bg-brand-accent/10 transition-colors group-hover:bg-brand-accent/20" />
          )}
          <Camera className="relative z-10 h-12 w-12 text-brand-accent" />
          <div className="absolute bottom-3 left-3 right-3 z-10">
            <p className="truncate text-sm font-medium text-white drop-shadow">
              {tour.name}
            </p>
          </div>
        </div>
        <CardContent className="p-4">
          <h3 className="font-semibold text-brand-primary dark:text-white">
            {tour.name}
          </h3>
          {tour.description && (
            <p className="mt-1 line-clamp-2 text-sm text-slate-500">
              {tour.description}
            </p>
          )}
          <div className="mt-3 flex items-center justify-between">
            {tour.capture_date && (
              <span className="flex items-center gap-1 text-xs text-slate-500">
                <Calendar className="h-3.5 w-3.5" />
                {formatDate(tour.capture_date)}
              </span>
            )}
            <div className="ml-auto flex gap-2">
              <Button variant="outline" size="sm" asChild>
                <a
                  href={getMatterportShareUrl(tour.matterport_url)}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                >
                  <ExternalLink className="mr-1 h-3.5 w-3.5" />
                  Open
                </a>
              </Button>
              <Button variant="accent" size="sm" onClick={() => setOpen(true)}>
                View Tour
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[95vh] max-w-5xl gap-0 overflow-hidden p-0">
          <DialogHeader className="border-b px-4 py-3">
            <DialogTitle>{tour.name}</DialogTitle>
          </DialogHeader>
          <div className="p-4">
            <MatterportViewer url={tour.matterport_url} title={tour.name} />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
