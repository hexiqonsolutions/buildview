"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { updateProjectRecord } from "@/lib/actions/admin";
import type { Client, PortfolioCategory, Project } from "@/lib/types";
import { PORTFOLIO_CATEGORY_LABELS } from "@/lib/types";
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
import { getErrorMessage } from "@/lib/errors/public";

type EditableProject = Pick<
  Project,
  | "id"
  | "name"
  | "client_id"
  | "client_name"
  | "location"
  | "status"
  | "description"
  | "start_date"
  | "completion_date"
  | "area_sqft"
  | "portfolio_category"
>;

interface EditProjectDetailsDialogProps {
  project: EditableProject;
  clients: Pick<Client, "id" | "name" | "company_name">[];
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: ReactNode;
}

export function EditProjectDetailsDialog({
  project,
  clients,
  open: controlledOpen,
  onOpenChange,
  trigger,
}: EditProjectDetailsDialogProps) {
  const router = useRouter();
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const open = controlledOpen ?? uncontrolledOpen;
  const setOpen = (next: boolean) => {
    if (controlledOpen === undefined) setUncontrolledOpen(next);
    onOpenChange?.(next);
  };

  const [clientId, setClientId] = useState(project.client_id);
  const [portfolioCategory, setPortfolioCategory] = useState(project.portfolio_category ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setClientId(project.client_id);
    setPortfolioCategory(project.portfolio_category ?? "");
    setError(null);
  }, [open, project]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (saving) return;
    const form = new FormData(e.currentTarget);
    const name = ((form.get("name") as string) ?? "").trim();
    const location = ((form.get("location") as string) ?? "").trim();
    if (name.length < 2) {
      setError("Project name must be at least 2 characters.");
      return;
    }
    if (!location) {
      setError("Location is required.");
      return;
    }

    const client = clients.find((c) => c.id === clientId);
    const sqftRaw = ((form.get("area_sqft") as string) ?? "").trim();
    const areaSqft = sqftRaw ? Number.parseInt(sqftRaw, 10) : null;

    setSaving(true);
    setError(null);
    const result = await updateProjectRecord({
      id: project.id,
      name,
      client_id: clientId,
      client_name: client?.company_name || client?.name || project.client_name,
      location,
      status: project.status,
      description: ((form.get("description") as string) ?? "").trim() || null,
      start_date: (form.get("start_date") as string) || null,
      completion_date: (form.get("completion_date") as string) || null,
      area_sqft: areaSqft && Number.isFinite(areaSqft) && areaSqft > 0 ? areaSqft : null,
      portfolio_category: (portfolioCategory || null) as PortfolioCategory | null,
    }).catch((err: unknown) => ({
      error: getErrorMessage(err, "Failed to update project"),
    }));
    setSaving(false);

    if (result?.error) {
      setError(result.error);
      return;
    }
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !saving && setOpen(next)}>
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
      <DialogContent
        className="max-h-[90vh] max-w-lg overflow-y-auto"
        onCloseAutoFocus={(e) => {
          e.preventDefault();
          document.body.style.pointerEvents = "";
        }}
      >
        <DialogHeader>
          <DialogTitle>Edit Project</DialogTitle>
        </DialogHeader>
        <form key={open ? project.id : "closed"} onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-project-name">Project Name</Label>
            <Input
              id="edit-project-name"
              name="name"
              defaultValue={project.name}
              required
              minLength={2}
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label>Client</Label>
            <Select value={clientId} onValueChange={setClientId}>
              <SelectTrigger>
                <SelectValue placeholder="Select client" />
              </SelectTrigger>
              <SelectContent>
                {clients.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.company_name || c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-project-location">Location</Label>
            <Input
              id="edit-project-location"
              name="location"
              defaultValue={project.location}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-project-area">Area (sq ft)</Label>
              <Input
                id="edit-project-area"
                name="area_sqft"
                type="number"
                min={1}
                defaultValue={project.area_sqft ?? ""}
                placeholder="2500"
              />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select
                value={portfolioCategory || "none"}
                onValueChange={(v) => setPortfolioCategory(v === "none" ? "" : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Optional" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {(Object.keys(PORTFOLIO_CATEGORY_LABELS) as PortfolioCategory[]).map((key) => (
                    <SelectItem key={key} value={key}>
                      {PORTFOLIO_CATEGORY_LABELS[key]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-project-start">Start Date</Label>
              <Input
                id="edit-project-start"
                name="start_date"
                type="date"
                defaultValue={project.start_date ?? ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-project-completion">Completion Date</Label>
              <Input
                id="edit-project-completion"
                name="completion_date"
                type="date"
                defaultValue={project.completion_date ?? ""}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-project-description">Description</Label>
            <Textarea
              id="edit-project-description"
              name="description"
              rows={3}
              defaultValue={project.description ?? ""}
            />
          </div>

          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" disabled={saving} onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" className="ops-btn-primary" disabled={saving || !clientId}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
