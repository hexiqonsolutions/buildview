"use client";

import { useState } from "react";
import { Bell, Loader2 } from "lucide-react";
import {
  sendInvoiceNotification,
  type InvoiceNotificationKind,
} from "@/lib/actions/admin";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const NOTIFICATION_OPTIONS: {
  kind: InvoiceNotificationKind;
  label: string;
  description: string;
}[] = [
  {
    kind: "sent",
    label: "Invoice sent",
    description: "New invoice available in portal",
  },
  {
    kind: "pending",
    label: "Payment pending",
    description: "Remind client payment is due",
  },
  {
    kind: "paid",
    label: "Payment received",
    description: "Confirm payment was recorded",
  },
  {
    kind: "overdue",
    label: "Payment overdue",
    description: "Alert client invoice is overdue",
  },
];

interface SendInvoiceNotificationMenuProps {
  invoiceId: string;
}

export function SendInvoiceNotificationMenu({
  invoiceId,
}: SendInvoiceNotificationMenuProps) {
  const [pending, setPending] = useState<InvoiceNotificationKind | null>(null);

  async function handleSend(kind: InvoiceNotificationKind) {
    setPending(kind);
    try {
      const result = await sendInvoiceNotification(invoiceId, kind);
      if (result.success) {
        alert("Notification sent to client.");
      } else {
        alert(result.error ?? "Failed to send notification");
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to send notification");
    } finally {
      setPending(null);
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1.5"
          disabled={!!pending}
          title="Send notification to client"
        >
          {pending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Bell className="h-3.5 w-3.5" />
          )}
          <span className="hidden sm:inline">Notify</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel>Send to client</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {NOTIFICATION_OPTIONS.map((option) => (
          <DropdownMenuItem
            key={option.kind}
            disabled={!!pending}
            onClick={() => handleSend(option.kind)}
          >
            <div className="flex flex-col gap-0.5">
              <span className="font-medium">{option.label}</span>
              <span className="text-xs text-muted-foreground">
                {option.description}
              </span>
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
