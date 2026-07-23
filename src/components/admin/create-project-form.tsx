"use client";

import { cn } from "@/lib/utils";

import { useState } from "react";
import { Plus, Loader2 } from "lucide-react";
import { createProject } from "@/lib/actions/admin";
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

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const form = new FormData(e.currentTarget);
    const client = clients.find((c) => c.id === clientId);
    const sqftRaw = (form.get("area_sqft") as string)?.trim();
    const areaSqft = sqftRaw ? Number.parseInt(sqftRaw, 10) : null;

    try {
      await createProject({
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
      setOpen(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to create project");
    }
    setLoading(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className={cn("ops-btn-primary h-9", triggerClassName)}>
          <Plus className="mr-1 h-4 w-4" /> {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Create New Project</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
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
