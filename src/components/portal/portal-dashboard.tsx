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
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
      {actions.map((action) => (
        <Link
          key={action.href}
          href={withPortalWorkspaceQuery(action.href, workspaceQuery)}
          className="intel-card group dashboard-card-hover flex flex-col items-center justify-center gap-2.5 p-4 text-center sm:p-5"
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 transition-colors duration-150 group-hover:bg-brand-accent/20 dark:bg-slate-800">
            <action.icon
              className="h-5 w-5 text-slate-700 transition-colors group-hover:text-slate-900 dark:text-slate-300 dark:group-hover:text-white"
              strokeWidth={1.75}
            />
          </div>
          <p className="text-sm font-semibold tracking-tight text-slate-900 dark:text-white">
            {action.label}
          </p>
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
    <div className="intel-hero-strip relative flex flex-col gap-4 overflow-hidden sm:flex-row sm:items-center sm:justify-between sm:gap-6">
      <div className="pointer-events-none absolute -right-8 -top-10 h-40 w-40 rounded-full bg-brand-accent/10 blur-3xl" />
      <div className="relative z-10 flex min-w-0 flex-1 items-center gap-4 sm:gap-5">
        <Link
          href={profileHref}
          className="shrink-0 self-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2"
          aria-label="Open profile"
        >
          <Avatar className="h-16 w-16 ring-2 ring-white shadow-soft dark:ring-slate-800 sm:h-20 sm:w-20">
            <AvatarImage
              src={avatarUrl || undefined}
              alt={fullName || firstName}
              className="object-cover"
            />
            <AvatarFallback className="bg-slate-900 text-lg font-semibold text-white sm:text-xl">
              {welcomeInitials(fullName || firstName, email)}
            </AvatarFallback>
          </Avatar>
        </Link>
        <div className="min-w-0 flex-1">
          <p className={typography.eyebrow}>Executive Overview</p>
          <h1 className={`mt-1 truncate ${typography.intelHeroTitle}`}>
            Welcome Back, {firstName}
          </h1>
          <p className="mt-1.5 max-w-md text-sm leading-relaxed text-slate-500 dark:text-slate-400">
            Track construction progress, 3D tours, reports, and milestones across your active
            projects.
          </p>
        </div>
      </div>
      <div className="relative hidden shrink-0 items-center justify-center sm:flex">
        <div className="pointer-events-none absolute h-28 w-28 rounded-full bg-brand-accent/20 blur-2xl" />
        <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-800 to-slate-950 shadow-lift lg:h-20 lg:w-20">
          <Building2 className="h-8 w-8 text-brand-accent lg:h-10 lg:w-10" strokeWidth={1.25} />
        </div>
      </div>
    </div>
  );
}
