"use client";

import { useEffect, useState, useTransition } from "react";
import { LeadPriority, LeadStatus } from "@prisma/client";
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
  LEAD_PRIORITIES,
  LEAD_STATUSES,
  labelize,
} from "@/lib/leads/constants";
import type { LeadFormValues } from "@/lib/leads/schema";
import type { LeadListItem } from "@/lib/leads/queries";
import { createLeadAction, updateLeadAction } from "@/lib/leads/actions";

type LeadFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead?: LeadListItem | null;
  canWrite: boolean;
};

function toDateInput(value: string | null | undefined) {
  if (!value) return "";
  return value.slice(0, 10);
}

function emptyValues(): LeadFormValues {
  return {
    company: "",
    contactName: "",
    email: undefined,
    phone: undefined,
    whatsapp: undefined,
    linkedin: undefined,
    website: undefined,
    industry: undefined,
    location: undefined,
    designation: undefined,
    leadSource: undefined,
    priority: LeadPriority.MEDIUM,
    status: LeadStatus.NEW,
    projectType: undefined,
    budget: undefined,
    expectedRevenue: undefined,
    notes: undefined,
    tags: [],
    nextFollowUpAt: undefined,
    lastContactedAt: undefined,
  };
}

function fromLead(lead: LeadListItem): LeadFormValues {
  return {
    company: lead.company,
    contactName: lead.contactName,
    email: lead.email ?? undefined,
    phone: lead.phone ?? undefined,
    whatsapp: lead.whatsapp ?? undefined,
    linkedin: lead.linkedin ?? undefined,
    website: lead.website ?? undefined,
    industry: lead.industry ?? undefined,
    location: lead.location ?? undefined,
    designation: lead.designation ?? undefined,
    leadSource: lead.leadSource ?? undefined,
    priority: lead.priority as LeadPriority,
    status: lead.status as LeadStatus,
    projectType: lead.projectType ?? undefined,
    budget: lead.budget ?? undefined,
    expectedRevenue: lead.expectedRevenue ?? undefined,
    notes: lead.notes ?? undefined,
    tags: lead.tags.map((tag) => tag.name),
    nextFollowUpAt: lead.nextFollowUpAt ?? undefined,
    lastContactedAt: lead.lastContactedAt ?? undefined,
  };
}

export function LeadFormDialog({
  open,
  onOpenChange,
  lead,
  canWrite,
}: LeadFormDialogProps) {
  const editing = Boolean(lead);
  const [values, setValues] = useState<LeadFormValues>(() =>
    lead ? fromLead(lead) : emptyValues()
  );
  const [tagInput, setTagInput] = useState(
    () => (lead ? lead.tags.map((t) => t.name).join(", ") : "")
  );
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    setValues(lead ? fromLead(lead) : emptyValues());
    setTagInput(lead ? lead.tags.map((t) => t.name).join(", ") : "");
  }, [open, lead]);

  function setField<K extends keyof LeadFormValues>(
    key: K,
    value: LeadFormValues[K]
  ) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!canWrite) return;

    const payload: LeadFormValues = {
      ...values,
      tags: tagInput
        .split(",")
        .map((part) => part.trim())
        .filter(Boolean),
    };

    startTransition(async () => {
      const result = editing
        ? await updateLeadAction(lead!.id, payload)
        : await createLeadAction(payload);

      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      toast.success(editing ? "Lead updated" : "Lead created");
      onOpenChange(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? "Edit lead" : "Add lead"}</DialogTitle>
          <DialogDescription>
            Capture company, contact, pipeline status, and project economics.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Company" required>
              <Input
                required
                value={values.company}
                onChange={(e) => setField("company", e.target.value)}
                disabled={!canWrite}
              />
            </Field>
            <Field label="Contact name" required>
              <Input
                required
                value={values.contactName}
                onChange={(e) => setField("contactName", e.target.value)}
                disabled={!canWrite}
              />
            </Field>
            <Field label="Email">
              <Input
                type="email"
                value={values.email ?? ""}
                onChange={(e) => setField("email", e.target.value)}
                disabled={!canWrite}
              />
            </Field>
            <Field label="Phone">
              <Input
                value={values.phone ?? ""}
                onChange={(e) => setField("phone", e.target.value)}
                disabled={!canWrite}
              />
            </Field>
            <Field label="WhatsApp">
              <Input
                value={values.whatsapp ?? ""}
                onChange={(e) => setField("whatsapp", e.target.value)}
                disabled={!canWrite}
              />
            </Field>
            <Field label="LinkedIn">
              <Input
                value={values.linkedin ?? ""}
                onChange={(e) => setField("linkedin", e.target.value)}
                disabled={!canWrite}
              />
            </Field>
            <Field label="Website">
              <Input
                value={values.website ?? ""}
                onChange={(e) => setField("website", e.target.value)}
                disabled={!canWrite}
              />
            </Field>
            <Field label="Industry">
              <Input
                value={values.industry ?? ""}
                onChange={(e) => setField("industry", e.target.value)}
                disabled={!canWrite}
              />
            </Field>
            <Field label="Location">
              <Input
                value={values.location ?? ""}
                onChange={(e) => setField("location", e.target.value)}
                disabled={!canWrite}
              />
            </Field>
            <Field label="Designation">
              <Input
                value={values.designation ?? ""}
                onChange={(e) => setField("designation", e.target.value)}
                disabled={!canWrite}
              />
            </Field>
            <Field label="Lead source">
              <Input
                value={values.leadSource ?? ""}
                onChange={(e) => setField("leadSource", e.target.value)}
                disabled={!canWrite}
              />
            </Field>
            <Field label="Project type">
              <Input
                value={values.projectType ?? ""}
                onChange={(e) => setField("projectType", e.target.value)}
                disabled={!canWrite}
              />
            </Field>
            <Field label="Status">
              <Select
                value={values.status}
                onValueChange={(value) => setField("status", value as LeadStatus)}
                disabled={!canWrite}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LEAD_STATUSES.map((status) => (
                    <SelectItem key={status} value={status}>
                      {labelize(status)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Priority">
              <Select
                value={values.priority}
                onValueChange={(value) =>
                  setField("priority", value as LeadPriority)
                }
                disabled={!canWrite}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LEAD_PRIORITIES.map((priority) => (
                    <SelectItem key={priority} value={priority}>
                      {labelize(priority)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Budget">
              <Input
                type="number"
                min={0}
                step="0.01"
                value={values.budget ?? ""}
                onChange={(e) =>
                  setField(
                    "budget",
                    e.target.value === "" ? undefined : Number(e.target.value)
                  )
                }
                disabled={!canWrite}
              />
            </Field>
            <Field label="Expected revenue">
              <Input
                type="number"
                min={0}
                step="0.01"
                value={values.expectedRevenue ?? ""}
                onChange={(e) =>
                  setField(
                    "expectedRevenue",
                    e.target.value === "" ? undefined : Number(e.target.value)
                  )
                }
                disabled={!canWrite}
              />
            </Field>
            <Field label="Next follow-up">
              <Input
                type="date"
                value={toDateInput(values.nextFollowUpAt)}
                onChange={(e) => setField("nextFollowUpAt", e.target.value || undefined)}
                disabled={!canWrite}
              />
            </Field>
            <Field label="Last contacted">
              <Input
                type="date"
                value={toDateInput(values.lastContactedAt)}
                onChange={(e) =>
                  setField("lastContactedAt", e.target.value || undefined)
                }
                disabled={!canWrite}
              />
            </Field>
            <Field label="Tags" className="sm:col-span-2">
              <Input
                placeholder="commercial, high-rise, tender"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                disabled={!canWrite}
              />
            </Field>
            <Field label="Notes" className="sm:col-span-2">
              <Textarea
                value={values.notes ?? ""}
                onChange={(e) => setField("notes", e.target.value)}
                disabled={!canWrite}
              />
            </Field>
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
              <Button type="submit" disabled={pending}>
                {pending ? <Loader2 className="animate-spin" /> : null}
                {editing ? "Save changes" : "Create lead"}
              </Button>
            ) : null}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  required,
  className,
  children,
}: {
  label: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`space-y-2 ${className ?? ""}`}>
      <Label>
        {label}
        {required ? <span className="text-orange-400"> *</span> : null}
      </Label>
      {children}
    </div>
  );
}
