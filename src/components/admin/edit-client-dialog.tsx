"use client";

import { useState } from "react";
import { Loader2, Pencil } from "lucide-react";
import { updateClientRecord, softDeleteClient } from "@/lib/actions/admin";
import type { Client, ClientDashboardType, SubscriptionStatus } from "@/lib/types";
import {
  CLIENT_DASHBOARD_TYPE_DESCRIPTIONS,
  CLIENT_DASHBOARD_TYPE_LABELS,
} from "@/lib/portal/dashboard-type";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function EditClientDialog({ client }: { client: Client }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus>(
    client.subscription_status
  );
  const [isActive, setIsActive] = useState(client.is_active);
  const [dashboardType, setDashboardType] = useState<ClientDashboardType>(
    client.dashboard_type ?? "construction"
  );
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const form = new FormData(e.currentTarget);

    try {
      await updateClientRecord({
        id: client.id,
        name: form.get("name") as string,
        company_name: (form.get("company_name") as string) || null,
        email: form.get("email") as string,
        phone: (form.get("phone") as string) || null,
        address: (form.get("address") as string) || null,
        subscription_status: subscriptionStatus,
        is_active: isActive,
        dashboard_type: dashboardType,
      });
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update client");
    }
    setLoading(false);
  }

  async function handleDelete() {
    if (!confirm(`Deactivate client "${client.company_name || client.name}"?`)) return;
    setLoading(true);
    setError(null);
    try {
      await softDeleteClient(client.id);
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to deactivate client");
    }
    setLoading(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Pencil className="mr-1.5 h-4 w-4" />
          Edit
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Client</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor={`name-${client.id}`}>Contact Name</Label>
            <Input
              id={`name-${client.id}`}
              name="name"
              defaultValue={client.name}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`company-${client.id}`}>Company Name</Label>
            <Input
              id={`company-${client.id}`}
              name="company_name"
              defaultValue={client.company_name ?? ""}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`email-${client.id}`}>Email</Label>
            <Input
              id={`email-${client.id}`}
              name="email"
              type="email"
              defaultValue={client.email}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`phone-${client.id}`}>Phone</Label>
            <Input
              id={`phone-${client.id}`}
              name="phone"
              defaultValue={client.phone ?? ""}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`address-${client.id}`}>Address</Label>
            <Input
              id={`address-${client.id}`}
              name="address"
              defaultValue={client.address ?? ""}
            />
          </div>
          <div className="space-y-2 rounded-lg border border-slate-200 p-3 dark:border-slate-700">
            <Label>Default Client Dashboard</Label>
            <Select
              value={dashboardType}
              onValueChange={(v) => setDashboardType(v as ClientDashboardType)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="construction">
                  {CLIENT_DASHBOARD_TYPE_LABELS.construction}
                </SelectItem>
                <SelectItem value="portfolio">
                  {CLIENT_DASHBOARD_TYPE_LABELS.portfolio}
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-slate-500">
              {CLIENT_DASHBOARD_TYPE_DESCRIPTIONS[dashboardType]}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Subscription</Label>
              <Select
                value={subscriptionStatus}
                onValueChange={(v) => setSubscriptionStatus(v as SubscriptionStatus)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="trial">Trial</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={isActive ? "active" : "inactive"}
                onValueChange={(v) => setIsActive(v === "active")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <div className="flex gap-2">
            <Button type="submit" className="ops-btn-primary flex-1" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={loading}
              onClick={handleDelete}
            >
              Deactivate
            </Button>
          </div>
          <p className="text-xs text-slate-500">
            Deactivate removes this client (and its projects) from active lists.
          </p>
        </form>
      </DialogContent>
    </Dialog>
  );
}
