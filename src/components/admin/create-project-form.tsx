"use client";

import { cn } from "@/lib/utils";

import { useEffect, useState } from "react";
import { ImagePlus, Loader2, Plus, X } from "lucide-react";
import { createProject, updateProjectCoverImage } from "@/lib/actions/admin";
import {
  uploadProjectCoverFile,
  validateProjectCoverFile,
} from "@/lib/supabase/storage";
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
import type { Client, PortfolioCategory } from "@/lib/types";
import { PORTFOLIO_CATEGORY_LABELS } from "@/lib/types";

export function CreateProjectForm({
  clients,
  triggerLabel = "Add Project",
  triggerClassName,
}: {
  clients: Client[];
  triggerLabel?: string;
  triggerClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [clientId, setClientId] = useState("");
  const [status, setStatus] = useState("planning");
  const [portfolioCategory, setPortfolioCategory] = useState<string>("");
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);

  useEffect(() => {
    if (!thumbnailFile) {
      setThumbnailPreview(null);
      return;
    }
    const url = URL.createObjectURL(thumbnailFile);
    setThumbnailPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [thumbnailFile]);

  function resetFormState() {
    setClientId("");
    setStatus("planning");
    setPortfolioCategory("");
    setThumbnailFile(null);
    setThumbnailPreview(null);
  }

  function handleThumbnailChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    e.target.value = "";
    if (!file) return;
    const error = validateProjectCoverFile(file);
    if (error) {
      alert(error);
      return;
    }
    setThumbnailFile(file);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const form = new FormData(e.currentTarget);
    const client = clients.find((c) => c.id === clientId);
    const sqftRaw = (form.get("area_sqft") as string)?.trim();
    const areaSqft = sqftRaw ? Number.parseInt(sqftRaw, 10) : null;

    try {
      const projectId = await createProject({
        name: form.get("name") as string,
        client_id: clientId,
        client_name: client?.company_name || client?.name || "",
        location: form.get("location") as string,
        start_date: form.get("start_date") as string,
        completion_date: form.get("completion_date") as string,
        status,
        description: form.get("description") as string,
        area_sqft: areaSqft && Number.isFinite(areaSqft) ? areaSqft : null,
        portfolio_category: (portfolioCategory || null) as PortfolioCategory | null,
      });

      if (thumbnailFile) {
        const upload = await uploadProjectCoverFile(projectId, thumbnailFile);
        await updateProjectCoverImage(projectId, upload.publicUrl);
      }

      resetFormState();
      setOpen(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to create project");
    }
    setLoading(false);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) resetFormState();
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm" className={cn("ops-btn-primary h-9", triggerClassName)}>
          <Plus className="mr-1 h-4 w-4" /> {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Project</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Thumbnail</Label>
            <div className="flex items-start gap-3">
              <div className="relative flex h-24 w-32 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-dashed border-slate-300 bg-slate-50 dark:border-slate-700 dark:bg-slate-900">
                {thumbnailPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={thumbnailPreview}
                    alt="Project thumbnail preview"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <ImagePlus className="h-6 w-6 text-slate-400" />
                )}
              </div>
              <div className="min-w-0 flex-1 space-y-2">
                <Input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={handleThumbnailChange}
                  className="cursor-pointer text-xs file:mr-2 file:rounded file:border-0 file:bg-slate-100 file:px-2 file:py-1 file:text-xs"
                />
                <p className="text-[11px] text-slate-500">
                  Optional. JPEG, PNG, WebP, or GIF up to 5 MB.
                </p>
                {thumbnailFile ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs text-slate-600"
                    onClick={() => setThumbnailFile(null)}
                  >
                    <X className="mr-1 h-3.5 w-3.5" />
                    Remove
                  </Button>
                ) : null}
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Project Name</Label>
            <Input name="name" required placeholder="Navi Mumbai Commercial Tower" />
          </div>
          <div className="space-y-2">
            <Label>Client</Label>
            <Select value={clientId || undefined} onValueChange={setClientId} required>
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
            <Label>Location</Label>
            <Input name="location" required placeholder="Navi Mumbai, India" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Area (sq ft)</Label>
              <Input name="area_sqft" type="number" min={1} placeholder="2500" />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select
                value={portfolioCategory || undefined}
                onValueChange={setPortfolioCategory}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Optional" />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(PORTFOLIO_CATEGORY_LABELS) as PortfolioCategory[]).map(
                    (key) => (
                      <SelectItem key={key} value={key}>
                        {PORTFOLIO_CATEGORY_LABELS[key]}
                      </SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Input name="start_date" type="date" />
            </div>
            <div className="space-y-2">
              <Label>Completion Date</Label>
              <Input name="completion_date" type="date" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="planning">Planning</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="on_hold">On Hold</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea name="description" rows={3} />
          </div>
          <Button type="submit" className="ops-btn-primary w-full" disabled={loading || !clientId}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Project
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
