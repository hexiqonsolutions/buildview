"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { updateInvoiceStatus } from "@/lib/actions/admin";
import { INVOICE_STATUS_LABELS, type InvoiceStatus } from "@/lib/types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface UpdateInvoiceStatusSelectProps {
  invoiceId: string;
  currentStatus: InvoiceStatus;
}

export function UpdateInvoiceStatusSelect({
  invoiceId,
  currentStatus,
}: UpdateInvoiceStatusSelectProps) {
  const [status, setStatus] = useState(currentStatus);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleChange(next: InvoiceStatus) {
    setStatus(next);
    setError(null);

    startTransition(async () => {
      try {
        await updateInvoiceStatus(invoiceId, next);
      } catch (err) {
        setStatus(currentStatus);
        setError(err instanceof Error ? err.message : "Failed to update status");
      }
    });
  }

  return (
    <div className="flex items-center gap-2">
      <Select value={status} onValueChange={(v) => handleChange(v as InvoiceStatus)}>
        <SelectTrigger className="h-8 w-32 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {(Object.keys(INVOICE_STATUS_LABELS) as InvoiceStatus[]).map((value) => (
            <SelectItem key={value} value={value}>
              {INVOICE_STATUS_LABELS[value]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {isPending && <Loader2 className="h-4 w-4 animate-spin text-slate-400" />}
      {error && <span className="text-xs text-red-500">{error}</span>}
    </div>
  );
}
