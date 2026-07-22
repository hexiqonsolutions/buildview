"use client";

import { useMemo, useRef, useState } from "react";
import { Download, FileText, Loader2, Paperclip } from "lucide-react";
import { useAdminWorkspace } from "@/components/admin/workspace/admin-workspace-provider";
import { CreateInvoiceForm } from "@/components/admin/create-invoice-form";
import { UpdateInvoiceStatusSelect } from "@/components/admin/update-invoice-status";
import { attachInvoicePdf, getInvoiceDownloadUrl } from "@/lib/actions/admin";
import { uploadInvoiceFile } from "@/lib/supabase/storage";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Client, Invoice, InvoiceStatus, Project } from "@/lib/types";

type InvoiceRow = Invoice & {
  client?: { id: string; name: string; company_name: string | null } | null;
  project?: { id: string; name: string } | null;
};

interface InvoiceManagerProps {
  invoices: InvoiceRow[];
  clients: Client[];
  projects: Project[];
}

export function InvoiceManager({ invoices, clients, projects }: InvoiceManagerProps) {
  const { hydrated, scope, clientProjects, client, project } = useAdminWorkspace();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [attachTargetId, setAttachTargetId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let list = invoices;
    if (scope.clientId) {
      list = list.filter((i) => i.client_id === scope.clientId);
    }
    if (scope.projectId) {
      list = list.filter((i) => i.project_id === scope.projectId);
    }
    return list;
  }, [invoices, scope]);

  const scopedClients = scope.clientId
    ? clients.filter((c) => c.id === scope.clientId)
    : clients;
  const scopedProjects = scope.projectId
    ? projects.filter((p) => p.id === scope.projectId)
    : scope.clientId
      ? projects.filter((p) => clientProjects.some((cp) => cp.id === p.id))
      : projects;

  function openAttachDialog(invoiceId: string) {
    setAttachTargetId(invoiceId);
    fileInputRef.current?.click();
  }

  async function handleAttachFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    const invoiceId = attachTargetId;
    e.target.value = "";
    setAttachTargetId(null);
    if (!file || !invoiceId) return;

    const invoice = invoices.find((i) => i.id === invoiceId);
    if (!invoice) return;

    setPendingId(invoiceId);
    try {
      const upload = await uploadInvoiceFile(invoice.client_id, invoiceId, file);
      await attachInvoicePdf(invoiceId, { storage_path: upload.path });
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to attach PDF");
    }
    setPendingId(null);
  }

  async function handleDownload(invoiceId: string) {
    setDownloadingId(invoiceId);
    try {
      const { url, fileName } = await getInvoiceDownloadUrl(invoiceId);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = fileName;
      anchor.target = "_blank";
      anchor.rel = "noopener noreferrer";
      anchor.click();
    } catch (err) {
      alert(err instanceof Error ? err.message : "No PDF available");
    }
    setDownloadingId(null);
  }

  if (!hydrated) {
    return <div className="h-64 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />;
  }

  return (
    <div className="space-y-4">
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf,.pdf"
        className="hidden"
        onChange={handleAttachFile}
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-500">
          {filtered.length} invoice{filtered.length === 1 ? "" : "s"}
          {project ? ` · ${project.name}` : client ? ` · ${client.company_name || client.name}` : ""}
        </p>
        {filtered.length > 0 && (
          <CreateInvoiceForm clients={scopedClients} projects={scopedProjects} />
        )}
      </div>

      <div className="ops-card overflow-hidden">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center px-6 py-16 text-center">
            <FileText className="mb-3 h-10 w-10 text-slate-300" />
            <p className="font-medium text-slate-900 dark:text-white">No invoices yet</p>
            <p className="mt-1 text-sm text-slate-500">
              Create an invoice, attach a PDF, then mark it sent to notify the client.
            </p>
            <div className="mt-4">
              <CreateInvoiceForm clients={scopedClients} projects={scopedProjects} />
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Due</TableHead>
                  <TableHead>PDF</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-medium">{invoice.invoice_number}</TableCell>
                    <TableCell className="text-sm text-slate-600">
                      {invoice.client?.company_name || invoice.client?.name || "—"}
                    </TableCell>
                    <TableCell className="text-sm text-slate-500">
                      {invoice.project?.name || "—"}
                    </TableCell>
                    <TableCell>{formatCurrency(invoice.amount, invoice.currency)}</TableCell>
                    <TableCell>
                      <UpdateInvoiceStatusSelect
                        invoiceId={invoice.id}
                        currentStatus={invoice.status as InvoiceStatus}
                      />
                    </TableCell>
                    <TableCell className="text-sm text-slate-500">
                      {invoice.due_date ? formatDate(invoice.due_date) : "—"}
                    </TableCell>
                    <TableCell>
                      {invoice.storage_path || invoice.file_url ? (
                        <Badge variant="outline" className="text-[10px]">
                          Attached
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-[10px]">
                          Missing
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8"
                          disabled={pendingId === invoice.id}
                          onClick={() => openAttachDialog(invoice.id)}
                        >
                          {pendingId === invoice.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Paperclip className="h-3.5 w-3.5" />
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8"
                          disabled={
                            downloadingId === invoice.id ||
                            !(invoice.storage_path || invoice.file_url)
                          }
                          onClick={() => handleDownload(invoice.id)}
                        >
                          {downloadingId === invoice.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Download className="h-3.5 w-3.5" />
                          )}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}
