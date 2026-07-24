"use client";

import { useEffect, useState, useTransition } from "react";
import { ImagePlus, Loader2, Pencil, Users, X } from "lucide-react";
import {
  assignUserToProject,
  softDeleteProject,
  unassignUserFromProject,
  updateProjectCoverImage,
  updateProjectRecord,
} from "@/lib/actions/admin";
import { getProjectAssignments } from "@/lib/actions/data";
import {
  uploadProjectCoverFile,
  validateProjectCoverFile,
} from "@/lib/supabase/storage";
import type { Client, PortfolioCategory, Project, ProjectStatus, User } from "@/lib/types";
import { PORTFOLIO_CATEGORY_LABELS, PROJECT_STATUS_LABELS } from "@/lib/types";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface EditProjectDialogProps {
  project: Project;
  clients: Client[];
  users: User[];
}

export function EditProjectDialog({ project, clients, users }: EditProjectDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [clientId, setClientId] = useState(project.client_id);
  const [status, setStatus] = useState<ProjectStatus>(project.status);
  const [portfolioCategory, setPortfolioCategory] = useState<string>(
    project.portfolio_category ?? ""
  );
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  const [removeCover, setRemoveCover] = useState(false);
  const [assignments, setAssignments] = useState<
    Array<{ id: string; user: { id: string; full_name: string; email: string } | null }>
  >([]);
  const [addUserId, setAddUserId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    setClientId(project.client_id);
    setStatus(project.status);
    setPortfolioCategory(project.portfolio_category ?? "");
    setThumbnailFile(null);
    setRemoveCover(false);
    setError(null);

    async function loadAssignments() {
      const data = await getProjectAssignments(project.id);
      setAssignments(
        data as Array<{
          id: string;
          user: { id: string; full_name: string; email: string } | null;
        }>
      );
    }

    loadAssignments();
  }, [open, project]);

  useEffect(() => {
    if (!thumbnailFile) {
      setThumbnailPreview(null);
      return;
    }
    const url = URL.createObjectURL(thumbnailFile);
    setThumbnailPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [thumbnailFile]);

  const clientUsers = users.filter(
    (u) => u.role === "client" && u.is_active && !u.deleted_at
  );
  const assignedUserIds = new Set(
    assignments.map((a) => a.user?.id).filter(Boolean) as string[]
  );
  const coverPreview =
    thumbnailPreview || (!removeCover ? project.cover_image_url : null);

  function handleThumbnailChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    e.target.value = "";
    if (!file) return;
    const validationError = validateProjectCoverFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    setRemoveCover(false);
    setThumbnailFile(file);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    const client = clients.find((c) => c.id === clientId);

    const sqftRaw = (form.get("area_sqft") as string)?.trim();
    const areaSqft = sqftRaw ? Number.parseInt(sqftRaw, 10) : null;

    try {
      await updateProjectRecord({
        id: project.id,
        name: form.get("name") as string,
        client_id: clientId,
        client_name: client?.company_name || client?.name || project.client_name,
        location: form.get("location") as string,
        status,
        description: (form.get("description") as string) || null,
        start_date: (form.get("start_date") as string) || null,
        completion_date: (form.get("completion_date") as string) || null,
        area_sqft: areaSqft && Number.isFinite(areaSqft) ? areaSqft : null,
        portfolio_category: (portfolioCategory || null) as PortfolioCategory | null,
      });

      if (thumbnailFile) {
        const upload = await uploadProjectCoverFile(project.id, thumbnailFile);
        await updateProjectCoverImage(project.id, upload.publicUrl);
      } else if (removeCover && project.cover_image_url) {
        await updateProjectCoverImage(project.id, null);
      }

      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update project");
    }
    setLoading(false);
  }

  async function handleDelete() {
    if (!confirm(`Archive project "${project.name}"?`)) return;
    setLoading(true);
    try {
      await softDeleteProject(project.id);
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to archive project");
    }
    setLoading(false);
  }

  function handleAssignUser() {
    if (!addUserId) return;
    startTransition(async () => {
      try {
        await assignUserToProject(project.id, addUserId);
        const data = await getProjectAssignments(project.id);
        setAssignments(
          data as Array<{
            id: string;
            user: { id: string; full_name: string; email: string } | null;
          }>
        );
        setAddUserId("");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to assign user");
      }
    });
  }

  function handleUnassign(userId: string) {
    startTransition(async () => {
      try {
        await unassignUserFromProject(project.id, userId);
        const data = await getProjectAssignments(project.id);
        setAssignments(
          data as Array<{
            id: string;
            user: { id: string; full_name: string; email: string } | null;
          }>
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to remove user");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Pencil className="mr-1.5 h-4 w-4" />
          Manage
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manage Project — {project.name}</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="details">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="team">
              <Users className="mr-1.5 h-4 w-4" />
              Team
            </TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="mt-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Thumbnail</Label>
                <div className="flex items-start gap-3">
                  <div className="relative flex h-24 w-32 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-dashed border-slate-300 bg-slate-50 dark:border-slate-700 dark:bg-slate-900">
                    {coverPreview ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={coverPreview}
                        alt="Project thumbnail"
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
                      JPEG, PNG, WebP, or GIF up to 5 MB.
                    </p>
                    {(coverPreview || thumbnailFile) && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs text-slate-600"
                        onClick={() => {
                          setThumbnailFile(null);
                          setRemoveCover(true);
                        }}
                      >
                        <X className="mr-1 h-3.5 w-3.5" />
                        Remove
                      </Button>
                    )}
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Project Name</Label>
                <Input name="name" defaultValue={project.name} required />
              </div>
              <div className="space-y-2">
                <Label>Client</Label>
                <Select value={clientId} onValueChange={setClientId}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.company_name || client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Location</Label>
                <Input name="location" defaultValue={project.location} required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Area (sq ft)</Label>
                  <Input
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
                  <Input
                    name="start_date"
                    type="date"
                    defaultValue={project.start_date ?? ""}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Completion Date</Label>
                  <Input
                    name="completion_date"
                    type="date"
                    defaultValue={project.completion_date ?? ""}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={status}
                  onValueChange={(v) => setStatus(v as ProjectStatus)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(PROJECT_STATUS_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  name="description"
                  rows={3}
                  defaultValue={project.description ?? ""}
                />
              </div>

              {error && <p className="text-sm text-red-500">{error}</p>}

              <div className="flex gap-2">
                <Button type="submit" className="ops-btn-primary flex-1" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={loading}
                  onClick={handleDelete}
                >
                  Archive
                </Button>
              </div>
            </form>
          </TabsContent>

          <TabsContent value="team" className="mt-4 space-y-4">
            {assignments.length === 0 ? (
              <p className="text-sm text-slate-500">No users assigned to this project.</p>
            ) : (
              <ul className="space-y-2">
                {assignments.map((assignment) => (
                  <li
                    key={assignment.id}
                    className="flex items-center justify-between rounded-md bg-slate-50 px-3 py-2 text-sm dark:bg-slate-800/50"
                  >
                    <div>
                      <p className="font-medium">{assignment.user?.full_name}</p>
                      <p className="text-xs text-slate-500">{assignment.user?.email}</p>
                    </div>
                    {assignment.user && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={isPending}
                        onClick={() => handleUnassign(assignment.user!.id)}
                      >
                        Remove
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            )}

            <div className="flex gap-2">
              <Select value={addUserId} onValueChange={setAddUserId}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Add client user" />
                </SelectTrigger>
                <SelectContent>
                  {clientUsers
                    .filter((u) => !assignedUserIds.has(u.id))
                    .map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.full_name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <Button
                type="button"
                variant="outline"
                disabled={!addUserId || isPending}
                onClick={handleAssignUser}
              >
                Add
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
