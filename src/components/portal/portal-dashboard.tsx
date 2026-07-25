import Link from "next/link";
import {
  Camera,
  Calendar,
  Columns2,
  Download,
  Building2,
} from "lucide-react";
import { typography } from "@/design-system/typography";
import { withPortalWorkspaceQuery } from "@/lib/portal/nav";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

function welcomeInitials(name?: string | null, email?: string | null) {
  const source = name?.trim() || email?.trim() || "?";
  return source
    .split(/\s+/)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

const actions = [
  { href: "/dashboard/projects", label: "Open Matterport", icon: Camera },
  { href: "/dashboard/timeline", label: "View Timeline", icon: Calendar },
  { href: "/dashboard/matterport-comparison", label: "Compare Tours", icon: Columns2 },
  { href: "/dashboard/reports", label: "Download Report", icon: Download },
] as const;

export function PortalQuickActions({ workspaceQuery = "" }: { workspaceQuery?: string }) {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {actions.map((action) => (
        <Link
          key={action.href}
          href={withPortalWorkspaceQuery(action.href, workspaceQuery)}
          className="intel-card group dashboard-card-hover flex flex-col items-center justify-center gap-3 p-5 text-center"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 transition-colors group-hover:bg-brand-accent/20 dark:bg-slate-800">
            <action.icon className="h-6 w-6 text-slate-700 dark:text-slate-300" />
          </div>
          <p className="text-sm font-semibold text-slate-900 dark:text-white">{action.label}</p>
        </Link>
      ))}
    </div>
  );
}

export function PortalWelcomeBanner({
  firstName,
  fullName,
  email,
  avatarUrl,
  profileHref = "/dashboard/profile",
}: {
  firstName: string;
  fullName?: string | null;
  email?: string | null;
  avatarUrl?: string | null;
  profileHref?: string;
}) {
  return (
    <div className="intel-hero-strip flex flex-col gap-5 overflow-hidden sm:flex-row sm:items-center sm:justify-between sm:gap-6">
      <div className="relative z-10 flex min-w-0 flex-1 items-center gap-4 sm:gap-5">
        <Link
          href={profileHref}
          className="shrink-0 self-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2"
          aria-label="Open profile"
        >
          <Avatar className="h-20 w-20 ring-2 ring-white shadow-md dark:ring-slate-800 sm:h-24 sm:w-24">
            <AvatarImage
              src={avatarUrl || undefined}
              alt={fullName || firstName}
              className="object-cover"
            />
            <AvatarFallback className="bg-slate-900 text-xl font-semibold text-white sm:text-2xl">
              {welcomeInitials(fullName || firstName, email)}
            </AvatarFallback>
          </Avatar>
        </Link>
        <div className="min-w-0 flex-1">
          <p className={typography.eyebrow}>Executive Overview</p>
          <h1 className={`mt-1 truncate ${typography.intelHeroTitle}`}>
            Welcome Back, {firstName}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-500 sm:max-w-md">
            Track construction progress, 3D tours, reports, and milestones across your active
            projects.
          </p>
        </div>
      </div>
      <div className="relative hidden shrink-0 items-center justify-center sm:flex">
        <div className="pointer-events-none absolute h-32 w-32 rounded-full bg-brand-accent/15 blur-2xl" />
        <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 shadow-lg lg:h-24 lg:w-24">
          <Building2 className="h-10 w-10 text-brand-accent lg:h-12 lg:w-12" strokeWidth={1.25} />
        </div>
      </div>
    </div>
  );
}