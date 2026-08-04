"use client";

import { useEffect, useState, useTransition } from "react";
import { DocumentType } from "@prisma/client";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  uploadDocumentAction,
  updateDocumentAction,
} from "@/lib/documents/actions";
import {
  DOCUMENT_TYPES,
  inferDocumentType,
  MAX_DOCUMENT_BYTES,
} from "@/lib/documents/schema";
import type { DocumentListItem } from "@/lib/documents/queries";

type LeadOption = {
  id: string;
  company: string;
  contactName: string;
};

type DocumentFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leads: LeadOption[];
  document?: DocumentListItem | null;
  canWrite: boolean;
  defaultLeadId?: string;
};

function labelize(value: string) {
  return value.charAt(0) + value.slice(1).toLowerCase();
}

export function DocumentFormDialog({
  open,
  onOpenChange,
  leads,
  document,
  canWrite,
  defaultLeadId,
}: DocumentFormDialogProps) {
  const editing = Boolean(document);
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [type, setType] = useState<DocumentType>(DocumentType.PDF);
  const [leadId, setLeadId] = useState("");
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    if (!open) return;
    if (document) {
      setName(document.name);
      setType(document.type);
      setLeadId(document.lead?.id || "");
      setFile(null);
    } else {
      setName("");
      setType(DocumentType.PDF);
      setLeadId(defaultLeadId || "");
      setFile(null);
    }
  }, [open, document, defaultLeadId]);

  function onFileChange(next: File | null) {
    setFile(next);
    if (!next) return;
    if (!name.trim()) setName(next.name.replace(/\.[^.]+$/, "") || next.name);
    setType(inferDocumentType(next.type || "application/octet-stream"));
  }

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!canWrite) return;

    startTransition(async () => {
      if (editing) {
        const result = await updateDocumentAction(document!.id, {
          name,
          type,
          leadId: leadId || undefined,
        });
        if (!result.ok) {
          toast.error(result.error);
          return;
        }
        toast.success("Document updated");
        onOpenChange(false);
        return;
      }

      if (!file) {
        toast.error("Choose a file to upload");
        return;
      }
      if (file.size > MAX_DOCUMENT_BYTES) {
        toast.error("File must be 25 MB or smaller");
        return;
      }

      const formData = new FormData();
      formData.set("file", file);
      formData.set("name", name);
      formData.set("type", type);
      if (leadId) formData.set("leadId", leadId);

      const result = await uploadDocumentAction(formData);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Document uploaded");
      onOpenChange(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {editing ? "Edit document" : "Upload document"}
          </DialogTitle>
          <DialogDescription>
            Attach proposals, quotations, contracts, and PDFs to a lead.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
          {!editing ? (
            <div className="space-y-2">
              <Label htmlFor="document-file">File</Label>
              <Input
                id="document-file"
                type="file"
                required
                disabled={!canWrite}
                accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.png,.jpg,.jpeg,.webp,.gif"
                onChange={(e) => onFileChange(e.target.files?.[0] ?? null)}
              />
              <p className="text-xs text-zinc-500">Max 25 MB</p>
            </div>
          ) : null}

          <div className="space-y-2">
            <Label>Name</Label>
            <Input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Steel package quotation"
              disabled={!canWrite}
            />
          </div>

          <div className="space-y-2">
            <Label>Type</Label>
            <Select
              value={type}
              onValueChange={(value) => setType(value as DocumentType)}
              disabled={!canWrite}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DOCUMENT_TYPES.map((item) => (
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
                {editing ? "Save" : "Upload"}
              </Button>
            ) : null}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
