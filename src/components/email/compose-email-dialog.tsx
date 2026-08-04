"use client";

import { useState, useTransition } from "react";
import { Loader2, Paperclip, Send, Save } from "lucide-react";
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
import { RichTextEditor } from "@/components/email/rich-text-editor";
import { composeEmailAction } from "@/lib/email/actions";

type LeadOption = {
  id: string;
  company: string;
  contactName: string;
  email: string | null;
  projectType: string | null;
};

type ComposeEmailDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accountId: string;
  leads: LeadOption[];
  replyTo?: {
    messageId: string;
    to: string[];
    subject: string;
    bodyHtml?: string | null;
  } | null;
  initialSubject?: string;
  initialBody?: string;
};

type AttachmentDraft = {
  filename: string;
  mimeType: string;
  contentBase64: string;
  sizeBytes: number;
};

function splitEmails(value: string) {
  return value
    .split(/[,;\s]+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

export function ComposeEmailDialog({
  open,
  onOpenChange,
  accountId,
  leads,
  replyTo,
  initialSubject,
  initialBody,
}: ComposeEmailDialogProps) {
  const [pending, startTransition] = useTransition();
  const [to, setTo] = useState(replyTo?.to.join(", ") ?? "");
  const [cc, setCc] = useState("");
  const [bcc, setBcc] = useState("");
  const [subject, setSubject] = useState(
    initialSubject ||
      (replyTo?.subject
        ? replyTo.subject.startsWith("Re:")
          ? replyTo.subject
          : `Re: ${replyTo.subject}`
        : "")
  );
  const [bodyHtml, setBodyHtml] = useState(
    initialBody ||
      (replyTo?.bodyHtml
        ? `<p></p><blockquote>${replyTo.bodyHtml}</blockquote>`
        : "<p></p>")
  );
  const [leadId, setLeadId] = useState<string>("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [attachments, setAttachments] = useState<AttachmentDraft[]>([]);

  async function onAttach(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    const next: AttachmentDraft[] = [];
    for (const file of files) {
      const buffer = await file.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      let binary = "";
      bytes.forEach((byte) => {
        binary += String.fromCharCode(byte);
      });
      next.push({
        filename: file.name,
        mimeType: file.type || "application/octet-stream",
        contentBase64: btoa(binary),
        sizeBytes: file.size,
      });
    }
    setAttachments((prev) => [...prev, ...next]);
  }

  function submit(mode: "send" | "draft" | "schedule") {
    startTransition(async () => {
      const result = await composeEmailAction({
        accountId,
        to: splitEmails(to),
        cc: splitEmails(cc),
        bcc: splitEmails(bcc),
        subject,
        bodyHtml,
        leadId: leadId || undefined,
        replyToMessageId: replyTo?.messageId,
        mode,
        scheduledAt: mode === "schedule" ? scheduledAt : undefined,
        attachments,
      });

      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      toast.success(
        mode === "send"
          ? "Email sent"
          : mode === "draft"
            ? "Draft saved"
            : "Email scheduled"
      );
      onOpenChange(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{replyTo ? "Reply" : "Compose email"}</DialogTitle>
          <DialogDescription>
            Review the message before sending. Use variables for personalization.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label>To</Label>
              <Input
                value={to}
                onChange={(e) => setTo(e.target.value)}
                placeholder="name@company.com"
              />
            </div>
            <div className="space-y-2">
              <Label>Cc</Label>
              <Input value={cc} onChange={(e) => setCc(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Bcc</Label>
              <Input value={bcc} onChange={(e) => setBcc(e.target.value)} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Link lead (optional)</Label>
              <Select
                value={leadId || "none"}
                onValueChange={(value) => {
                  const next = value === "none" ? "" : value;
                  setLeadId(next);
                  const lead = leads.find((item) => item.id === next);
                  if (lead?.email) setTo(lead.email);
                }}
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
            <div className="space-y-2 sm:col-span-2">
              <Label>Subject</Label>
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </div>
          </div>

          <RichTextEditor
            value={bodyHtml}
            onChange={setBodyHtml}
            enableAi
            subject={subject}
            onSubjectChange={setSubject}
            contextHtml={replyTo?.bodyHtml || undefined}
            lead={
              leadId
                ? (() => {
                    const lead = leads.find((item) => item.id === leadId);
                    return lead
                      ? {
                          contactName: lead.contactName,
                          company: lead.company,
                          projectType: lead.projectType || undefined,
                        }
                      : undefined;
                  })()
                : undefined
            }
          />

          <div className="flex flex-wrap items-center gap-3">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-zinc-800 px-3 py-2 text-sm text-zinc-300 transition-colors hover:border-orange-500/40">
              <Paperclip className="size-4 text-orange-400" />
              Attach files
              <input
                type="file"
                multiple
                className="hidden"
                onChange={onAttach}
              />
            </label>
            {attachments.map((file) => (
              <span
                key={file.filename + file.sizeBytes}
                className="rounded-md border border-zinc-800 bg-zinc-950 px-2 py-1 text-xs text-zinc-400"
              >
                {file.filename}
              </span>
            ))}
          </div>

          <div className="space-y-2">
            <Label>Schedule send (optional)</Label>
            <Input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          <Button
            type="button"
            variant="secondary"
            disabled={pending}
            className="cursor-pointer"
            onClick={() => submit("draft")}
          >
            {pending ? <Loader2 className="animate-spin" /> : <Save className="size-4" />}
            Save draft
          </Button>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={pending || !scheduledAt}
              className="cursor-pointer"
              onClick={() => submit("schedule")}
            >
              Schedule
            </Button>
            <Button
              type="button"
              disabled={pending}
              className="cursor-pointer"
              onClick={() => submit("send")}
            >
              {pending ? <Loader2 className="animate-spin" /> : <Send className="size-4" />}
              Send
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
