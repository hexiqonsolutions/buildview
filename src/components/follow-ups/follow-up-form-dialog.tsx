"use client";

import { useEffect, useState, useTransition } from "react";
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
  createFollowUpAction,
  updateFollowUpAction,
} from "@/lib/follow-ups/actions";
import type { FollowUpListItem } from "@/lib/follow-ups/queries";

type LeadOption = {
  id: string;
  company: string;
  contactName: string;
  email: string | null;
};

type FollowUpFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leads: LeadOption[];
  followUp?: FollowUpListItem | null;
  canWrite: boolean;
  defaultLeadId?: string;
};

function toLocalInput(iso: string) {
  const date = new Date(iso);
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60_000);
  return local.toISOString().slice(0, 16);
}

export function FollowUpFormDialog({
  open,
  onOpenChange,
  leads,
  followUp,
  canWrite,
  defaultLeadId,
}: FollowUpFormDialogProps) {
  const editing = Boolean(followUp);
  const [pending, startTransition] = useTransition();
  const [leadId, setLeadId] = useState(defaultLeadId || "");
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [dueAt, setDueAt] = useState("");

  useEffect(() => {
    if (!open) return;
    if (followUp) {
      setLeadId(followUp.lead.id);
      setTitle(followUp.title);
      setNotes(followUp.notes || "");
      setDueAt(toLocalInput(followUp.dueAt));
    } else {
      setLeadId(defaultLeadId || "");
      setTitle("");
      setNotes("");
      setDueAt("");
    }
  }, [open, followUp, defaultLeadId]);

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!canWrite) return;

    startTransition(async () => {
      const payload = {
        leadId,
        title,
        notes: notes || undefined,
        dueAt: new Date(dueAt).toISOString(),
      };

      const result = editing
        ? await updateFollowUpAction(followUp!.id, payload)
        : await createFollowUpAction(payload);

      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      toast.success(editing ? "Follow-up updated" : "Follow-up created");
      onOpenChange(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {editing ? "Edit follow-up" : "New follow-up"}
          </DialogTitle>
          <DialogDescription>
            Set a manual reminder linked to a lead. Overdue items surface
            automatically in notifications.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Lead</Label>
            <Select
              value={leadId || undefined}
              onValueChange={setLeadId}
              disabled={!canWrite}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select lead" />
              </SelectTrigger>
              <SelectContent>
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
              placeholder="Call about bid submission"
              disabled={!canWrite}
            />
          </div>

          <div className="space-y-2">
            <Label>Due</Label>
            <Input
              required
              type="datetime-local"
              value={dueAt}
              onChange={(e) => setDueAt(e.target.value)}
              disabled={!canWrite}
            />
          </div>

          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={!canWrite}
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
                {editing ? "Save" : "Create reminder"}
              </Button>
            ) : null}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
