"use client";

import { useState } from "react";
import { Plus, Loader2 } from "lucide-react";
import { createDocumentFolder } from "@/lib/actions/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import type { DocumentFolder, Project } from "@/lib/types";

interface CreateFolderFormProps {
  projects: Project[];
  folders?: DocumentFolder[];
}

export function CreateFolderForm({ projects, folders = [] }: CreateFolderFormProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [projectId, setProjectId] = useState("");
  const [parentId, setParentId] = useState<string>("none");
  const [error, setError] = useState<string | null>(null);

  const projectFolders = folders.filter((f) => f.project_id === projectId);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!projectId) return;

    setLoading(true);
    setError(null);
    const form = new FormData(e.currentTarget);

    try {
      await createDocumentFolder({
        project_id: projectId,
        name: form.get("name") as string,
        parent_id: parentId !== "none" ? parentId : undefined,
      });
      setOpen(false);
      setProjectId("");
      setParentId("none");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create folder");
    }
    setLoading(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus className="mr-1 h-4 w-4" /> New Folder
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Folder</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Project</Label>
            <Select
              value={projectId}
              onValueChange={(v) => {
                setProjectId(v);
                setParentId("none");
              }}
              required
            >
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

          <div className="space-y-2">
            <Label htmlFor="folder-name">Folder Name</Label>
            <Input
              id="folder-name"
              name="name"
              required
              placeholder="Drawings"
            />
          </div>

          {projectId && projectFolders.length > 0 && (
            <div className="space-y-2">
              <Label>Parent Folder (optional)</Label>
              <Select value={parentId} onValueChange={setParentId}>
                <SelectTrigger>
                  <SelectValue placeholder="Root level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Root level</SelectItem>
                  {projectFolders.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {error && <p className="text-sm text-red-500">{error}</p>}

          <Button
            type="submit"
            className="ops-btn-primary w-full"
            disabled={loading || !projectId}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Folder
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
