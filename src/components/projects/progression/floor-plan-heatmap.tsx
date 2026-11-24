"use client";

import { useMemo, useRef, useState } from "react";
import { Camera, ImagePlus, Loader2, PenLine, Trash2, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScanViewerDialog } from "@/components/projects/progression/progression-review";
import type { ZoneFloorView, ZoneProgressView } from "@/lib/actions/zone-progress";
import { formatPercent } from "@/lib/progression/completion";
import { heatFill, polygonCentroid } from "@/lib/progression/heat";
import type { ProgressionScan } from "@/lib/progression/types";
import type { ZoneResult } from "@/lib/progression/zone-completion";
import { createClient as createBrowserClient } from "@/lib/supabase/client";
import { createFloorPlanUploadUrl } from "@/lib/actions/zone-progress";
import { STORAGE_BUCKETS } from "@/lib/types";
import { getErrorMessage } from "@/lib/errors/public";
import { cn, formatDate } from "@/lib/utils";

type Ready = Extract<ZoneProgressView, { available: true }>;
type Point = [number, number];

const PLAN_TYPES = ["image/jpeg", "image/png", "image/webp"];
const PLAN_MAX_BYTES = 20 * 1024 * 1024;

const centroid = polygonCentroid;

const toSvg = (points: Point[]) => points.map(([x, y]) => `${x * 1000},${y * 1000}`).join(" ");

/**
 * Floor-plan heatmap (Milestone 4b): zones drawn on the floor plan, filled by
 * their completion %. Click a zone for its trade breakdown and the 360 scan.
 * Staff upload the plan and draw zone outlines.
 */
export function FloorPlanHeatmap({
  projectId,
  floor,
  view,
  busy,
  onSetPlan,
  onSavePolygon,
}: {
  projectId: string;
  floor: ZoneFloorView;
  view: Ready;
  busy: boolean;
  onSetPlan: (path: string | null) => void;
  onSavePolygon: (zoneId: string, polygon: Point[] | null) => void;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [drawingZoneId, setDrawingZoneId] = useState<string>("");
  const [points, setPoints] = useState<Point[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewing, setViewing] = useState<ProgressionScan | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const surfaceRef = useRef<HTMLDivElement>(null);

  const stageName = useMemo(() => new Map(view.stages.map((s) => [s.key, s.name])), [view.stages]);
  const outlined = floor.zones.filter((z) => z.polygon && z.polygon.length >= 3);
  const unplaced = floor.zones.filter((z) => !z.polygon || z.polygon.length < 3);
  const selected = floor.zones.find((z) => z.id === selectedId) ?? null;
  const drawing = drawingZoneId !== "";
  const latestScan = floor.scans[0] ?? null;

  async function handleUpload(file: File | undefined) {
    if (fileRef.current) fileRef.current.value = "";
    if (!file) return;
    setError(null);
    const type = (file.type || "").toLowerCase().replace("image/jpg", "image/jpeg");
    if (!PLAN_TYPES.includes(type)) return setError("Floor plans must be JPEG, PNG or WebP images.");
    if (file.size > PLAN_MAX_BYTES) return setError("Floor plans must be 20 MB or smaller.");
    setUploading(true);
    try {
      // Server-issued one-off link: client roles can't write to project-media directly.
      const ticket = await createFloorPlanUploadUrl({ projectId, fileName: file.name });
      if (!ticket.ok) throw new Error(ticket.error);
      const { error: uploadError } = await createBrowserClient()
        .storage.from(STORAGE_BUCKETS.PROJECT_MEDIA)
        .uploadToSignedUrl(ticket.path, ticket.token, file, { contentType: type });
      if (uploadError) throw uploadError;
      onSetPlan(ticket.path);
    } catch (err) {
      setError(getErrorMessage(err, "Upload failed."));
    } finally {
      setUploading(false);
    }
  }

  function addPoint(event: React.MouseEvent<HTMLDivElement>) {
    if (!drawing || !surfaceRef.current) return;
    const rect = surfaceRef.current.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;
    if (x < 0 || x > 1 || y < 0 || y > 1) return;
    setPoints((prev) => [...prev, [x, y]]);
  }

  function startDrawing(zoneId: string) {
    setDrawingZoneId(zoneId);
    setPoints([]);
    setSelectedId(null);
  }

  function openScan(scan: ZoneFloorView["scans"][number]) {
    setViewing({
      id: scan.id,
      name: scan.name,
      captureDate: scan.date,
      createdAt: scan.date,
      floorId: scan.onFloor ? floor.floorId : null,
      matterportUrl: scan.matterportUrl,
    });
  }

  if (!floor.planUrl) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500 dark:border-slate-700">
        {view.canManage ? (
          <>
            <p>Upload this floor&apos;s plan, then draw each zone on it to see a heatmap.</p>
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => void handleUpload(e.target.files?.[0])} />
            <Button className="mt-3 bg-slate-900 text-white hover:bg-slate-800" disabled={uploading || busy} onClick={() => fileRef.current?.click()}>
              {uploading || busy ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <ImagePlus className="mr-1.5 h-4 w-4" />}
              Upload floor plan
            </Button>
            {error ? <p className="mt-2 text-red-600">{error}</p> : null}
          </>
        ) : (
          <p>No floor plan has been added for this floor yet.</p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {view.canManage ? (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          {drawing ? (
            <>
              <span className="text-slate-600 dark:text-slate-300">
                Click around{" "}
                <strong>{floor.zones.find((z) => z.id === drawingZoneId)?.name}</strong> on the plan ({points.length} point
                {points.length === 1 ? "" : "s"}).
              </span>
              <Button size="sm" variant="outline" className="h-9" disabled={points.length === 0} onClick={() => setPoints((p) => p.slice(0, -1))}>
                <Undo2 className="mr-1 h-3.5 w-3.5" /> Undo
              </Button>
              <Button
                size="sm"
                className="h-9 bg-slate-900 text-white hover:bg-slate-800"
                disabled={points.length < 3 || busy}
                onClick={() => {
                  onSavePolygon(drawingZoneId, points);
                  setDrawingZoneId("");
                  setPoints([]);
                }}
              >
                Save outline
              </Button>
              <Button size="sm" variant="ghost" className="h-9" onClick={() => { setDrawingZoneId(""); setPoints([]); }}>
                Cancel
              </Button>
            </>
          ) : (
            <>
              <label className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                <PenLine className="h-4 w-4" aria-hidden />
                Draw outline for
                <select
                  value=""
                  onChange={(e) => e.target.value && startDrawing(e.target.value)}
                  className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                >
                  <option value="">Choose a zone…</option>
                  {floor.zones.map((z) => (
                    <option key={z.id} value={z.id}>
                      {z.name}
                      {z.polygon ? " (redraw)" : ""}
                    </option>
                  ))}
                </select>
              </label>
              <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => void handleUpload(e.target.files?.[0])} />
              <Button size="sm" variant="outline" className="h-9" disabled={uploading || busy} onClick={() => fileRef.current?.click()}>
                {uploading ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <ImagePlus className="mr-1 h-3.5 w-3.5" />}
                Replace plan
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-9 text-slate-500 hover:text-red-600"
                disabled={busy}
                onClick={() => window.confirm("Remove this floor plan? Zone outlines stay saved.") && onSetPlan(null)}
              >
                <Trash2 className="mr-1 h-3.5 w-3.5" /> Remove plan
              </Button>
            </>
          )}
        </div>
      ) : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <div
          ref={surfaceRef}
          onClick={addPoint}
          className={cn(
            "relative overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800",
            drawing && "cursor-crosshair"
          )}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={floor.planUrl} alt={`Floor plan · ${floor.label}`} className="block h-auto w-full select-none" draggable={false} />
          <svg viewBox="0 0 1000 1000" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
            {outlined.map((zone) => {
              const heat = heatFill(zone.percent);
              const active = zone.id === selectedId;
              return (
                <polygon
                  key={zone.id}
                  points={toSvg(zone.polygon!)}
                  fill={heat.fill}
                  stroke={active ? "#0f172a" : "#ffffff"}
                  strokeWidth={active ? 6 : 3}
                  vectorEffect="non-scaling-stroke"
                  className={drawing ? "pointer-events-none" : "cursor-pointer"}
                  tabIndex={drawing ? -1 : 0}
                  role="button"
                  aria-label={`${zone.name}, ${formatPercent(zone.percent)}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedId(zone.id);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") setSelectedId(zone.id);
                  }}
                />
              );
            })}
            {drawing && points.length > 0 ? (
              <polyline
                points={toSvg(points)}
                fill="rgba(164,207,48,0.25)"
                stroke="#76b82d"
                strokeWidth={3}
                vectorEffect="non-scaling-stroke"
              />
            ) : null}
          </svg>
          {/* Labels as HTML so text isn't stretched by the plan's aspect ratio. */}
          {outlined.map((zone) => {
            const [cx, cy] = centroid(zone.polygon!);
            return (
              <span
                key={zone.id}
                className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded bg-white/90 px-1.5 py-0.5 text-[11px] font-semibold text-slate-900 shadow-sm"
                style={{ left: `${cx * 100}%`, top: `${cy * 100}%` }}
              >
                {zone.name} · {formatPercent(zone.percent)}
              </span>
            );
          })}
          {drawing
            ? points.map(([x, y], i) => (
                <span
                  key={i}
                  className="pointer-events-none absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-[#76b82d]"
                  style={{ left: `${x * 100}%`, top: `${y * 100}%` }}
                />
              ))
            : null}
        </div>

        <div className="space-y-3">
          {selected ? (
            <ZoneDetail
              zone={selected}
              view={view}
              stageName={stageName}
              latestScan={latestScan}
              onOpenScan={() => latestScan && openScan(latestScan)}
            />
          ) : (
            <p className="rounded-xl bg-slate-50 p-3 text-sm text-slate-500 dark:bg-slate-950/60">
              {outlined.length > 0
                ? "Click a zone on the plan to see its trades."
                : view.canManage
                  ? "Draw zone outlines to colour them on the plan."
                  : "Zones haven't been drawn on this plan yet."}
            </p>
          )}

          <ul className="space-y-1 text-xs text-slate-600 dark:text-slate-300" aria-label="Heatmap legend">
            {[0, 25, 50, 100].map((p) => {
              const heat = heatFill(p);
              return (
                <li key={p} className="flex items-center gap-2">
                  <span className="h-3 w-5 rounded-sm border border-white shadow-sm" style={{ background: heat.fill }} aria-hidden />
                  {heat.label}
                </li>
              );
            })}
          </ul>

          {unplaced.length > 0 ? (
            <p className="text-xs text-slate-500">
              Not on the plan yet: {unplaced.map((z) => z.name).join(", ")}
            </p>
          ) : null}
        </div>
      </div>

      <ScanViewerDialog scan={viewing} onOpenChange={(open) => !open && setViewing(null)} />
    </div>
  );
}

function ZoneDetail({
  zone,
  view,
  stageName,
  latestScan,
  onOpenScan,
}: {
  zone: ZoneResult;
  view: Ready;
  stageName: Map<string, string>;
  latestScan: ZoneFloorView["scans"][number] | null;
  onOpenScan: () => void;
}) {
  return (
    <div className="space-y-3 rounded-xl border border-slate-200 p-3 dark:border-slate-800">
      <div className="flex items-baseline justify-between gap-2">
        <p className="font-display text-base font-semibold text-slate-900 dark:text-white">{zone.name}</p>
        <p className="font-semibold tabular-nums text-slate-900 dark:text-white">{formatPercent(zone.percent)}</p>
      </div>
      <ul className="divide-y divide-slate-100 text-sm dark:divide-slate-800">
        {view.activities.map((activity) => {
          const cell = zone.cells[activity.key];
          const na = cell?.percent == null;
          return (
            <li key={activity.key} className="flex items-center justify-between gap-2 py-1.5">
              <span className="text-slate-700 dark:text-slate-300">{activity.name}</span>
              <span className="text-right text-xs text-slate-500">
                {na
                  ? "N/A"
                  : `${stageName.get(cell?.latestStageKey ?? cell?.countedStageKey ?? "not_started") ?? "Not started"} · ${formatPercent(cell?.percent ?? 0)}`}
                {cell?.latestStatus === "pending" ? " · awaiting review" : ""}
                {cell?.latestObservedOn ? ` · ${formatDate(cell.latestObservedOn)}` : ""}
              </span>
            </li>
          );
        })}
      </ul>
      {latestScan ? (
        <Button size="sm" variant="outline" className="h-10 w-full" onClick={onOpenScan}>
          <Camera className="mr-1.5 h-4 w-4" />
          Open {latestScan.onFloor ? "latest scan of this floor" : "latest project scan"} ({formatDate(latestScan.date)})
        </Button>
      ) : (
        <p className="text-xs text-slate-500">No 360 scan to open yet.</p>
      )}
    </div>
  );
}
