"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { MatterportViewer } from "@/components/projects/MatterportViewer";
import { Button } from "@/components/ui/button";
import type { DemoTour } from "@/fixtures/types";
import { formatDate } from "@/lib/utils";

export function CompareView({
  projectName,
  projectHref,
  scanA,
  scanB,
}: {
  projectName: string;
  projectHref: string;
  scanA: DemoTour;
  scanB: DemoTour;
}) {
  return (
    <div className="dashboard-page">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Button variant="ghost" size="sm" asChild className="dashboard-ghost-link mb-2">
            <Link href={projectHref}>
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to project
            </Link>
          </Button>
          <p className="dashboard-section-eyebrow">Scan comparison</p>
          <h1 className="dashboard-section-title mt-0.5">{projectName}</h1>
          <p className="mt-1 text-sm text-slate-500">
            Same Matterport model with early vs handover capture dates — mirrors production compare UX.
          </p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {[
          { label: "Scan A — early", tour: scanA },
          { label: "Scan B — handover", tour: scanB },
        ].map((pane) => (
          <section key={pane.label} className="compare-card overflow-hidden">
            <div className="border-b border-slate-100 px-4 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                {pane.label}
              </p>
              <h2 className="mt-1 text-sm font-semibold text-slate-900">{pane.tour.name}</h2>
              <p className="text-xs text-slate-500">
                {formatDate(pane.tour.capture_date)} · {pane.tour.building} / {pane.tour.floor}
              </p>
            </div>
            <div className="p-3">
              <MatterportViewer url={pane.tour.matterport_url} title={pane.tour.name} />
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
