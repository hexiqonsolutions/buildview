"use client";

import { useEffect, useState, useTransition } from "react";
import { ActivityType } from "@prisma/client";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  createActivityAction,
  updateActivityAction,
} from "@/lib/activities/actions";
import { MANUAL_ACTIVITY_TYPES } from "@/lib/activities/schema";
import type { ActivityListItem } from "@/lib/activities/queries";

type LeadOption = {
  id: string;
  company: string;
  contactName: string;
};

type ActivityFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leads: LeadOption[];
  activity?: ActivityListItem | null;
  canWrite: boolean;
  defaultLeadId?: string;
  defaultType?: ActivityType;
};

function labelize(value: string) {
  return value.charAt(0) + value.slice(1).toLowerCase();
}

function toLocalInput(iso: string) {
  const date = new Date(iso);
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60_000);
  return local.toISOString().slice(0, 16);
}

export function ActivityFormDialog({
  open,
  onOpenChange,
  leads,
  activity,
  canWrite,
  defaultLeadId,
  defaultType,
}: ActivityFormDialogProps) {
  const editing = Boolean(activity);
  const [pending, startTransition] = useTransition();
  const [type, setType] = useState<ActivityType>(ActivityType.CALL);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [leadId, setLeadId] = useState("");
  const [occurredAt, setOccurredAt] = useState("");

  useEffect(() => {
    if (!open) return;
    if (activity) {
      setType(activity.type);
      setTitle(activity.title);
      setBody(activity.body || "");
      setLeadId(activity.lead?.id || "");
      setOccurredAt(toLocalInput(activity.occurredAt));
    } else {
      setType(defaultType || ActivityType.CALL);
      setTitle("");
      setBody("");
      setLeadId(defaultLeadId || "");
      setOccurredAt(toLocalInput(new Date().toISOString()));
    }
  }, [open, activity, defaultLeadId, defaultType]);

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!canWrite) return;

    startTransition(async () => {
      const payload = {
        type,
        title,
        body: body || undefined,
        leadId: leadId || undefined,
        occurredAt: new Date(occurredAt).toISOString(),
      };

      const result = editing
        ? await updateActivityAction(activity!.id, payload)
        : await createActivityAction(payload);

      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      toast.success(editing ? "Activity updated" : "Activity logged");
      onOpenChange(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {editing ? "Edit activity" : "Log activity"}
          </DialogTitle>
          <DialogDescription>
            Record calls, meetings, tasks, and notes on the sales timeline.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Type</Label>
            <Select
              value={type}
              onValueChange={(value) => setType(value as ActivityType)}
              disabled={!canWrite || activity?.type === "EMAIL"}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MANUAL_ACTIVITY_TYPES.map((item) => (
                  <SelectItem key={item} value={item}>
                    {labelize(item)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Lead (optional)</Label>
            <Select
              value={leadId || "none"}
              onValueChange={(value) => setLeadId(value === "none" ? "" : value)}
              disabled={!canWrite}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select lead" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No lead</SelectItem>
                {leads.map((lead) => (
                  <SelectItem key={lead.id} value={lead.id}>
                    {lead.contactName} · {lead.company}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Title</Label>
            <Input
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Called estimator about steel package"
              disabled={!canWrite}
            />
          </div>

          <div className="space-y-2">
            <Label>When</Label>
            <Input
              required
              type="datetime-local"
              value={occurredAt}
              onChange={(e) => setOccurredAt(e.target.value)}
              disabled={!canWrite}
            />
          </div>

          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              disabled={!canWrite}
              placeholder="Meeting outcomes, next steps…"
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            {canWrite ? (
              <Button type="submit" disabled={pending} className="cursor-pointer">
                {pending ? <Loader2 className="animate-spin" /> : null}
                {editing ? "Save" : "Log activity"}
              </Button>
            ) : null}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
