"use client";

import { useState, useTransition, useEffect } from "react";
import { Loader2, Plus, Link2, Building2, Layers } from "lucide-react";
import { createTour } from "@/lib/actions/admin";
import { getProjectSpatialHierarchy } from "@/lib/actions/buildings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MatterportViewer } from "@/components/projects/MatterportViewer";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { isValidMatterportUrl } from "@/lib/matterport";
import type { Building, Floor } from "@/lib/types";

/** Dialog-based Matterport URL uploader — lives on the project overview. */
export function ProjectMatterportUploader({
  projectId,
  triggerLabel = "Add Matterport link",
  triggerClassName,
  variant = "outline",
}: {
  projectId: string;
  triggerLabel?: string;
  triggerClassName?: string;
  variant?: "outline" | "default";
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [captureDate, setCaptureDate] = useState("");
  const [buildingId, setBuildingId] = useState("");
  const [floorId, setFloorId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const [buildings, setBuildings] = useState<Array<Building & { floors: Floor[] }>>([]);
  const [loadingBuildings, setLoadingBuildings] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoadingBuildings(true);
    getProjectSpatialHierarchy(projectId)
      .then((h) => setBuildings(h.buildings))
      .catch(() => setBuildings([]))
      .finally(() => setLoadingBuildings(false));
  }, [open, projectId]);

  const selectedBuilding = buildings.find((b) => b.id === buildingId);
  const floors = selectedBuilding?.floors ?? [];

  function handleUrlChange(value: string) {
    setUrl(value);
    setPreviewUrl(isValidMatterportUrl(value) ? value.trim() : null);
  }

  function resetForm() {
    setName("");
    setUrl("");
    setCaptureDate("");
    setBuildingId("");
    setFloorId("");
    setError(null);
    setPreviewUrl(null);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        await createTour({
          project_id: projectId,
          name: name.trim() || "Matterport Walkthrough",
          matterport_url: url.trim(),
          capture_date: captureDate || undefined,
          building_id: buildingId || undefined,
          floor_id: floorId || undefined,
        });
        resetForm();
        setOpen(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to add Matterport link");
      }
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) resetForm();
      }}
    >
      <DialogTrigger asChild>
        <Button
          type="button"
          variant={variant}
          size="sm"
          className={triggerClassName ?? "w-full sm:w-auto"}
        >
          <Plus className="mr-1.5 h-4 w-4" />
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-4 w-4" />
            Embed Matterport on this project
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="mp-url">Matterport share URL</Label>
            <Input
              id="mp-url"
              value={url}
              onChange={(e) => handleUrlChange(e.target.value)}
              placeholder="https://my.matterport.com/show/?m=..."
              required
            />
            <p className="text-xs text-slate-500">
              Paste the share link from Matterport (Showcase or Discover).
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="mp-name">Label</Label>
              <Input
                id="mp-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Living room walkthrough"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="mp-date">Capture date</Label>
              <Input
                id="mp-date"
                type="date"
                value={captureDate}
                onChange={(e) => setCaptureDate(e.target.value)}
              />
            </div>
          </div>

          {buildings.length > 0 && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5 text-slate-400" />
                  Building
                </Label>
                <Select
                  value={buildingId || "none"}
                  onValueChange={(v) => {
                    setBuildingId(v === "none" ? "" : v);
                    setFloorId("");
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select building" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— None —</SelectItem>
                    {buildings.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {floors.length > 0 && (
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1.5">
                    <Layers className="h-3.5 w-3.5 text-slate-400" />
                    Floor
                  </Label>
                  <Select
                    value={floorId || "none"}
                    onValueChange={(v) => setFloorId(v === "none" ? "" : v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select floor" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">— None —</SelectItem>
                      {floors.map((f) => (
                        <SelectItem key={f.id} value={f.id}>
                          {f.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}

          {loadingBuildings && (
            <p className="text-xs text-slate-400">Loading buildings…</p>
          )}

          {previewUrl && (
            <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
              <MatterportViewer url={previewUrl} title="Preview" aspectRatio showToolbar={false} />
            </div>
          )}

          {error && <p className="text-sm text-red-500">{error}</p>}

          <div className="flex flex-wrap gap-2">
            <Button type="submit" className="ops-btn-primary" disabled={isPending || !url.trim()}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save to project
            </Button>
            <Button type="button" variant="ghost" disabled={isPending} onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
