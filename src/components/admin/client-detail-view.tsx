"use client";

import Link from "next/link";
import {
  ArrowLeft,
  Building2,
  Calendar,
  FileText,
  FolderOpen,
  ImageIcon,
  AlertTriangle,
  Receipt,
  Settings,
  Upload,
} from "lucide-react";
import { TabWorkspace, TabPanel } from "@/components/patterns/tab-workspace";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LoginAsClientButton } from "@/components/admin/login-as-client-button";
import { EditClientDialog } from "@/components/admin/edit-client-dialog";
import { CLIENT_DASHBOARD_TYPE_LABELS } from "@/lib/portal/dashboard-type";
import { ClientWorkspaceSync } from "@/components/admin/workspace/client-workspace-sync";
import { OpsWorkspaceBanner } from "@/components/admin/ops/ops-workspace-banner";
import { formatDate } from "@/lib/utils";
import type {
  Client,
  Project,
  User,
  ProjectTour,
  Report,
  Document,
  Invoice,
  Issue,
  TimelineEvent,
} from "@/lib/types";

type ListableItem = { id: string; name?: string; title?: string; created_at?: string };

interface ClientDetailViewProps {
  client: Client;
  projects: Project[];
  users: User[];
  tours: ProjectTour[];
  reports: Report[];
  documents: Document[];
  invoices: Invoice[];
  issues: Issue[];
  timeline: (TimelineEvent & { project?: { id: string; name: string } | null })[];
}

export function ClientWorkspaceTabs({
  client,
  projects,
  users,
  tours,
  reports,
  documents,
  invoices,
  issues,
  timeline,
}: ClientDetailViewProps) {
  const primaryUser = users.find((u) => u.is_active) ?? users[0];
  const displayName = client.company_name || client.name;


  return (
    <div className="space-y-6">
      <ClientWorkspaceSync clientId={client.id} />

      <Button variant="ghost" size="sm" asChild className="-ml-2 text-slate-500">
        <Link href="/admin/clients">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Client Manager
        </Link>
      </Button>

      <OpsWorkspaceBanner />

      <div className="ops-card p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 text-xl font-bold text-slate-700 dark:from-slate-800 dark:to-slate-900 dark:text-white">
              {displayName.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Client Workspace
              </p>
              <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">
                {displayName}
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                {client.name} · {client.email}
                {client.phone ? ` · ${client.phone}` : ""}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Badge variant={client.is_active ? "outline" : "destructive"}>
                  {client.is_active ? "Active" : "Disabled"}
                </Badge>
                <Badge variant="secondary" className="capitalize">
                  {client.subscription_status}
                </Badge>
                <Badge variant="outline">{projects.length} projects</Badge>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {primaryUser && <LoginAsClientButton userId={primaryUser.id} />}
            <Button asChild size="sm" className="ops-btn-primary h-9">
              <Link href="/admin/upload">
                <Upload className="mr-1.5 h-4 w-4" />
                Upload
              </Link>
            </Button>
            <EditClientDialog client={client} />
          </div>
        </div>

      </div>

      <TabWorkspace
        variant="ops"
        defaultTab="overview"
        tabs={[
          { id: "overview", label: "Overview" },
          { id: "projects", label: "Projects", badge: projects.length },
          { id: "timeline", label: "Timeline", badge: timeline.length },
          { id: "reports", label: "Reports", badge: reports.length },
          { id: "documents", label: "Documents", badge: documents.length },
          { id: "photos", label: "Photos" },
          { id: "issues", label: "Issues", badge: issues.length },
          { id: "invoices", label: "Invoices", badge: invoices.length },
          { id: "users", label: "Users", badge: users.length },
          { id: "settings", label: "Settings" },
        ]}
      >
        <TabPanel value="overview" className="mt-6">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {[
              { label: "Projects", value: projects.length },
              { label: "Matterport", value: tours.length },
              { label: "Reports", value: reports.length },
              {
                label: "Open Issues",
                value: issues.filter((i) => i.status !== "resolved").length,
              },
            ].map((stat) => (
              <div key={stat.label} className="ops-card p-4 text-center">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  {stat.label}
                </p>
                <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">
                  {stat.value}
                </p>
              </div>
            ))}
          </div>
          {timeline.length > 0 && (
            <div className="ops-card mt-4 divide-y divide-slate-100 dark:divide-slate-800">
              <div className="flex items-center justify-between px-5 py-3">
                <p className="text-sm font-semibold text-slate-900 dark:text-white">
                  Recent timeline
                </p>
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/admin/timeline">View all</Link>
                </Button>
              </div>
              {timeline.slice(0, 5).map((event) => (
                <div key={event.id} className="flex items-center justify-between px-5 py-3">
                  <div>
                    <p className="text-sm font-medium text-slate-900 dark:text-white">
                      {event.title}
                    </p>
                    <p className="text-xs text-slate-500">
                      {(event.project as { name?: string } | null)?.name ?? "Project"} ·{" "}
                      {formatDate(event.event_date)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabPanel>

        <TabPanel value="projects" className="mt-6 space-y-3">
          <p className="text-sm text-slate-500">
            Matterport walkthroughs are embedded on each project. Open a project to add or
            manage links.
          </p>
          {projects.length === 0 ? (
            <div className="ops-card p-8 text-center text-sm text-slate-500">
              No projects for this client. Create one from Project Manager.
            </div>
          ) : (
            projects.map((p) => (
              <Link
                key={p.id}
                href={`/admin/projects/${p.id}`}
                className="ops-card flex items-center justify-between p-4 transition-all hover:shadow-md"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800">
                    <Building2 className="h-5 w-5 text-slate-500" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-900 dark:text-white">{p.name}</p>
                    <p className="text-xs text-slate-500">
                      {p.location || "No location"}
                      {" · "}
                      {tours.filter((t) => t.project_id === p.id).length} Matterport
                    </p>
                  </div>
                </div>
                <Badge className="capitalize">{p.status.replace(/_/g, " ")}</Badge>
              </Link>
            ))
          )}
        </TabPanel>

        <TabPanel value="timeline" className="mt-6">
          {timeline.length === 0 ? (
            <div className="ops-card p-8 text-center text-sm text-slate-500">
              No timeline events yet. Add updates from Upload Center.
            </div>
          ) : (
            <div className="ops-card divide-y divide-slate-100 dark:divide-slate-800">
              {timeline.map((event) => (
                <div key={event.id} className="flex items-start justify-between gap-4 px-5 py-4">
                  <div>
                    <p className="font-medium text-slate-900 dark:text-white">{event.title}</p>
                    {event.progress_note && (
                      <p className="mt-1 text-sm text-slate-500">{event.progress_note}</p>
                    )}
                    <p className="mt-1 text-xs text-slate-400">
                      {(event.project as { name?: string } | null)?.name ?? "Project"}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs text-slate-500">
                    {formatDate(event.event_date)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </TabPanel>

        <TabPanel value="photos" className="mt-6">
          <div className="ops-card flex flex-col items-center p-10 text-center">
            <ImageIcon className="mb-3 h-10 w-10 text-slate-300" />
            <p className="font-medium text-slate-900 dark:text-white">Site photo gallery</p>
            <p className="mt-1 max-w-sm text-sm text-slate-500">
              Photos are linked to timeline events. Upload site photos from the Upload Center.
            </p>
            <Button asChild className="mt-4 ops-btn-primary" size="sm">
              <Link href="/admin/upload?type=site_photos">Upload Photos</Link>
            </Button>
          </div>
        </TabPanel>

        <TabPanel value="users" className="mt-6 space-y-3">
          {users.length === 0 ? (
            <p className="text-sm text-slate-500">No portal users linked to this client.</p>
          ) : (
            users.map((u) => (
              <div key={u.id} className="ops-card flex items-center justify-between p-4">
                <div>
                  <p className="font-medium text-slate-900 dark:text-white">{u.full_name}</p>
                  <p className="text-xs text-slate-500">{u.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={u.is_active ? "outline" : "destructive"}>
                    {u.is_active ? "Active" : "Inactive"}
                  </Badge>
                  {u.is_active && <LoginAsClientButton userId={u.id} />}
                </div>
              </div>
            ))
          )}
        </TabPanel>

        <TabPanel value="settings" className="mt-6">
          <div className="ops-card p-6">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
              <Settings className="h-4 w-4" />
              Client settings
            </div>
            <dl className="mt-4 grid gap-4 sm:grid-cols-2">
              {[
                ["Company", displayName],
                ["Contact", client.name],
                ["Email", client.email],
                ["Phone", client.phone || "—"],
                ["Subscription", client.subscription_status],
                [
                  "Client dashboard",
                  CLIENT_DASHBOARD_TYPE_LABELS[client.dashboard_type ?? "construction"],
                ],
                ["Created", formatDate(client.created_at)],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    {label}
                  </dt>
                  <dd className="mt-1 text-sm capitalize text-slate-900 dark:text-white">
                    {value}
                  </dd>
                </div>
              ))}
            </dl>
            <div className="mt-6 flex flex-wrap gap-2">
              <EditClientDialog client={client} />
              {primaryUser && <LoginAsClientButton userId={primaryUser.id} />}
            </div>
          </div>
        </TabPanel>

        {(["reports", "documents", "invoices", "issues"] as const).map((tab) => {
          const items = { reports, documents, invoices, issues }[tab] as ListableItem[];
          const icons = {
            reports: FileText,
            documents: FolderOpen,
            invoices: Receipt,
            issues: AlertTriangle,
          };
          const Icon = icons[tab];
          return (
            <TabPanel key={tab} value={tab} className="mt-6">
              {items.length === 0 ? (
                <div className="ops-card flex flex-col items-center p-10 text-center">
                  <Icon className="mb-3 h-10 w-10 text-slate-300" />
                  <p className="text-sm text-slate-500">No {tab} yet.</p>
                  <Button asChild variant="outline" size="sm" className="mt-3">
                    <Link href="/admin/upload">Upload content</Link>
                  </Button>
                </div>
              ) : (
                <div className="ops-card divide-y divide-slate-100 dark:divide-slate-800">
                  {items.map((item) => (
                    <div key={item.id} className="flex items-center justify-between px-5 py-3">
                      <span className="text-sm font-medium text-slate-900 dark:text-white">
                        {item.name || item.title || item.id}
                      </span>
                      {item.created_at && (
                        <span className="text-xs text-slate-500">{formatDate(item.created_at)}</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </TabPanel>
          );
        })}
      </TabWorkspace>
    </div>
  );
}

/** @deprecated Use ClientWorkspaceTabs */
export const ClientDetailView = ClientWorkspaceTabs;
