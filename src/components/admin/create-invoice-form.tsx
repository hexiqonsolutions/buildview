"use client";

import { useEffect, useRef, useState } from "react";
import { Plus, Loader2, Paperclip } from "lucide-react";
import { createInvoice, attachInvoicePdf } from "@/lib/actions/admin";
import { uploadInvoiceFile } from "@/lib/supabase/storage";
import { getPlatformSettings } from "@/lib/actions/platform-settings";
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
import type { Client, Project } from "@/lib/types";

export function CreateInvoiceForm({
  clients,
  projects,
}: {
  clients: Client[];
  projects: Project[];
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [clientId, setClientId] = useState("");
  const [status, setStatus] = useState("draft");
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const form = new FormData(e.currentTarget);
    const settings = await getPlatformSettings();

    try {
      const invoiceId = await createInvoice({
        client_id: clientId,
        project_id: (form.get("project_id") as string) || undefined,
        invoice_number: form.get("invoice_number") as string,
        amount: parseFloat(form.get("amount") as string),
        currency: settings.defaultCurrency,
        status,
        due_date: form.get("due_date") as string,
        description: form.get("description") as string,
      });

      if (pdfFile) {
        const upload = await uploadInvoiceFile(clientId, invoiceId, pdfFile);
        await attachInvoicePdf(invoiceId, { storage_path: upload.path });
      }

      setOpen(false);
      setPdfFile(null);
      setClientId("");
      setStatus("draft");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to create invoice");
    }
    setLoading(false);
  }

  const clientProjects = clientId
    ? projects.filter((p) => p.client_id === clientId)
    : projects;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="ops-btn-primary h-9">
          <Plus className="mr-1.5 h-4 w-4" /> Create Invoice
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Invoice</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Client</Label>
            <Select value={clientId} onValueChange={setClientId} required>
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
            <Label>Project (optional)</Label>
            <Select name="project_id">
              <SelectTrigger>
                <SelectValue placeholder="Select project" />
              </SelectTrigger>
              <SelectContent>
                {clientProjects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Invoice Number</Label>
            <Input name="invoice_number" required placeholder="INV-2026-001" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Amount</Label>
              <Input name="amount" type="number" step="0.01" required />
            </div>
            <div className="space-y-2">
              <Label>Due Date</Label>
              <Input name="due_date" type="date" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea name="description" rows={2} />
          </div>
          <div className="space-y-2">
            <Label>Invoice PDF (optional)</Label>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf,.pdf"
              className="hidden"
              onChange={(e) => setPdfFile(e.target.files?.[0] ?? null)}
            />
            <Button
              type="button"
              variant="outline"
              className="w-full justify-start"
              onClick={() => fileInputRef.current?.click()}
            >
              <Paperclip className="mr-2 h-4 w-4" />
              {pdfFile ? pdfFile.name : "Attach PDF"}
            </Button>
          </div>
          <Button type="submit" className="ops-btn-primary w-full" disabled={loading || !clientId}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Invoice
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
