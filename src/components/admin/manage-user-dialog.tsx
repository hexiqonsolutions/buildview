"use client";

import { useEffect, useState, useTransition } from "react";
import { Loader2, Settings2 } from "lucide-react";
import {
  assignUserToProject,
  unassignUserFromProject,
  updateUserProfile,
} from "@/lib/actions/admin";
import { getUserAssignments } from "@/lib/actions/data";
import type { Client, ClientDashboardType, Project, User, UserRole } from "@/lib/types";
import { USER_ROLE_LABELS } from "@/lib/types";
import { isClientPortalRole } from "@/lib/auth/roles";
import {
  CLIENT_DASHBOARD_TYPE_DESCRIPTIONS,
  CLIENT_DASHBOARD_TYPE_LABELS,
  resolveClientDashboardType,
} from "@/lib/portal/dashboard-type";
import { Button } from "@/components/ui/button";
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

interface ManageUserDialogProps {
  user: User & {
    client?: {
      id: string;
      name: string;
      company_name: string | null;
      dashboard_type?: ClientDashboardType | null;
    } | null;
  };
  clients: Client[];
  projects: Project[];
}

function initialDashboardType(
  user: ManageUserDialogProps["user"],
  clients: Client[]
): ClientDashboardType {
  const linked =
    user.client_id != null
      ? clients.find((c) => c.id === user.client_id) ?? user.client ?? null
      : user.client ?? null;
  return resolveClientDashboardType(user, linked);
}

export function ManageUserDialog({ user, clients, projects }: ManageUserDialogProps) {
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState<UserRole>(user.role);
  const [clientId, setClientId] = useState(user.client_id ?? "none");
  const [dashboardType, setDashboardType] = useState<ClientDashboardType>(() =>
    initialDashboardType(user, clients)
  );
  const [isActive, setIsActive] = useState(user.is_active);
  const [assignments, setAssignments] = useState<
    Array<{ id: string; project: { id: string; name: string } | null }>
  >([]);
  const [addProjectId, setAddProjectId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loadingAssignments, setLoadingAssignments] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Reset form only when the dialog opens (not on every parent re-render).
  useEffect(() => {
    if (!open) return;

    setRole(user.role);
    setClientId(user.client_id ?? "none");
    setDashboardType(initialDashboardType(user, clients));
    setIsActive(user.is_active);
    setError(null);

    async function loadAssignments() {
      setLoadingAssignments(true);
      try {
        const data = await getUserAssignments(user.id);
        setAssignments(
          data as Array<{ id: string; project: { id: string; name: string } | null }>
        );
      } finally {
        setLoadingAssignments(false);
      }
    }

    loadAssignments();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: only when opening
  }, [open, user.id]);

  const assignedProjectIds = new Set(
    assignments.map((a) => a.project?.id).filter(Boolean) as string[]
  );

  const selectedClient =
    clientId === "none" ? null : clients.find((c) => c.id === clientId) ?? user.client ?? null;

  function handleClientChange(nextClientId: string) {
    setClientId(nextClientId);
    if (nextClientId === "none") {
      setDashboardType("construction");
      return;
    }
    const nextClient = clients.find((c) => c.id === nextClientId) ?? null;
    setDashboardType(nextClient?.dashboard_type ?? "construction");
  }

  function handleSaveProfile() {
    setError(null);
    startTransition(async () => {
      try {
        await updateUserProfile({
          id: user.id,
          role,
          client_id: clientId === "none" ? null : clientId,
          is_active: isActive,
          // Apply to client org + this user so the portal reliably switches
          client_dashboard_type: isClientPortalRole(role) ? dashboardType : undefined,
          dashboard_type: isClientPortalRole(role) ? dashboardType : null,
        });
        setOpen(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to update user");
      }
    });
  }

  function handleAssignProject() {
    if (!addProjectId) return;
    setError(null);
    startTransition(async () => {
      try {
        await assignUserToProject(addProjectId, user.id);
        const data = await getUserAssignments(user.id);
        setAssignments(
          data as Array<{ id: string; project: { id: string; name: string } | null }>
        );
        setAddProjectId("");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to assign project");
      }
    });
  }

  function handleUnassign(projectId: string) {
    setError(null);
    startTransition(async () => {
      try {
        await unassignUserFromProject(projectId, user.id);
        const data = await getUserAssignments(user.id);
        setAssignments(
          data as Array<{ id: string; project: { id: string; name: string } | null }>
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to remove assignment");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings2 className="mr-1.5 h-4 w-4" />
          Manage
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manage User — {user.full_name}</DialogTitle>
          <p className="text-sm text-muted-foreground">{user.email}</p>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Role</Label>
            <Select value={role} onValueChange={(v) => setRole(v as UserRole)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(USER_ROLE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isClientPortalRole(role) && (
            <div className="space-y-2">
              <Label>Client Organization</Label>
              <Select value={clientId} onValueChange={handleClientChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select client" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.company_name || client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {isClientPortalRole(role) && (
            <div className="space-y-2 rounded-lg border border-slate-200 p-3 dark:border-slate-700">
              <Label>Client Dashboard</Label>
              <Select
                value={dashboardType}
                onValueChange={(v) => setDashboardType(v as ClientDashboardType)}
                disabled={clientId === "none"}
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
              <p className="text-xs text-slate-400">
                {clientId === "none"
                  ? "Link a client organization first."
                  : `Saves on ${selectedClient?.company_name || selectedClient?.name || "this client"} — all linked users get this portal.`}
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label>Account Status</Label>
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

          {isClientPortalRole(role) && (
            <div className="space-y-3 rounded-lg border border-slate-200 p-3 dark:border-slate-700">
              <Label>Project Access</Label>
              {loadingAssignments ? (
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading assignments...
                </div>
              ) : assignments.length === 0 ? (
                <p className="text-sm text-slate-500">No projects assigned yet.</p>
              ) : (
                <ul className="space-y-2">
                  {assignments.map((assignment) => (
                    <li
                      key={assignment.id}
                      className="flex items-center justify-between rounded-md bg-slate-50 px-3 py-2 text-sm dark:bg-slate-800/50"
                    >
                      <span>{assignment.project?.name ?? "Unknown project"}</span>
                      {assignment.project && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={isPending}
                          onClick={() => handleUnassign(assignment.project!.id)}
                        >
                          Remove
                        </Button>
                      )}
                    </li>
                  ))}
                </ul>
              )}

              <div className="flex gap-2">
                <Select value={addProjectId} onValueChange={setAddProjectId}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Assign to project" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects
                      .filter((p) => !assignedProjectIds.has(p.id))
                      .map((project) => (
                        <SelectItem key={project.id} value={project.id}>
                          {project.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="outline"
                  disabled={!addProjectId || isPending}
                  onClick={handleAssignProject}
                >
                  Add
                </Button>
              </div>
            </div>
          )}

          {error && <p className="text-sm text-red-500">{error}</p>}

          <Button
            className="ops-btn-primary w-full"
            disabled={isPending}
            onClick={handleSaveProfile}
          >
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
