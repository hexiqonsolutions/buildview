"use client";

import { useState, useEffect } from "react";
import { Plus, Loader2, Eye, Building2, Layers } from "lucide-react";
import { createTour } from "@/lib/actions/admin";
import { getProjectSpatialHierarchy } from "@/lib/actions/buildings";
import { MatterportViewer } from "@/components/projects/MatterportViewer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { isValidMatterportUrl } from "@/lib/matterport";
import type { Project, Building, Floor } from "@/lib/types";

interface CreateTourFormProps {
  projects?: Project[];
  /** When provided, the project selector is hidden and this project is used directly. */
  fixedProjectId?: string;
  triggerLabel?: string;
}

export function CreateTourForm({
  projects = [],
  fixedProjectId,
  triggerLabel = "Add Tour",
}: CreateTourFormProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [projectId, setProjectId] = useState(fixedProjectId ?? "");
  const [matterportUrl, setMatterportUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const [buildingId, setBuildingId] = useState("");
  const [floorId, setFloorId] = useState("");
  const [buildings, setBuildings] = useState<Array<Building & { floors: Floor[] }>>([]);

  const urlIsValid = isValidMatterportUrl(matterportUrl);
  const selectedBuilding = buildings.find((b) => b.id === buildingId);
  const floors = selectedBuilding?.floors ?? [];

  useEffect(() => {
    if (!projectId) {
      setBuildings([]);
      setBuildingId("");
      setFloorId("");
      return;
    }
    getProjectSpatialHierarchy(projectId)
      .then((h) => setBuildings(h.buildings))
      .catch(() => setBuildings([]));
  }, [projectId]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const form = new FormData(e.currentTarget);

    try {
      await createTour({
        project_id: projectId,
        name: form.get("name") as string,
        matterport_url: matterportUrl,
        capture_date: (form.get("capture_date") as string) || undefined,
        description: (form.get("description") as string) || undefined,
        building_id: buildingId || undefined,
        floor_id: floorId || undefined,
      });
      setOpen(false);
      setMatterportUrl("");
      setProjectId(fixedProjectId ?? "");
      setBuildingId("");
      setFloorId("");
      setShowPreview(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create tour");
    }
    setLoading(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="ops-btn-primary h-9">
          <Plus className="mr-1 h-4 w-4" /> {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Matterport Tour</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {!fixedProjectId && (
            <div className="space-y-2">
              <Label>Project</Label>
              <Select value={projectId} onValueChange={setProjectId} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select project" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="tour-name">Tour Name</Label>
            <Input
              id="tour-name"
              name="name"
              required
              placeholder="Floor 12 — January Capture"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="matterport-url">Matterport URL</Label>
            <Input
              id="matterport-url"
              name="matterport_url"
              required
              value={matterportUrl}
              onChange={(e) => {
                setMatterportUrl(e.target.value);
                setShowPreview(false);
              }}
              placeholder="https://my.matterport.com/show/?m=..."
            />
            <p className="text-xs text-slate-500">
              Paste the share link from Matterport (Showcase or Discover).
            </p>
            {matterportUrl && !urlIsValid && (
              <p className="text-xs text-red-500">
                URL not recognized. Use a my.matterport.com link.
              </p>
            )}
          </div>

          {buildings.length > 0 && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
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
                <div className="space-y-2">
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

          {urlIsValid && (
            <div className="space-y-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowPreview((v) => !v)}
              >
                <Eye className="mr-2 h-4 w-4" />
                {showPreview ? "Hide Preview" : "Preview Tour"}
              </Button>
              {showPreview && (
                <MatterportViewer
                  url={matterportUrl}
                  title="Tour Preview"
                  showToolbar={false}
                />
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="capture-date">Capture Date</Label>
            <Input id="capture-date" name="capture_date" type="date" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" name="description" rows={2} />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <Button
            type="submit"
            className="ops-btn-primary w-full"
            disabled={loading || !projectId || !urlIsValid}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Tour
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
