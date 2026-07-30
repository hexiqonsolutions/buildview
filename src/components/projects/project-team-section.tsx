import { Users } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/dashboard/empty-state";
import { USER_ROLE_LABELS, type UserRole } from "@/lib/types";
import type { ProjectTeamMember } from "@/lib/actions/data";
import { isBuildViewStaffRole } from "@/lib/auth/roles";
import { cn } from "@/lib/utils";

function initials(name?: string | null, email?: string | null) {
  const source = name?.trim() || email?.trim() || "?";
  return source
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function roleBadgeClass(role: UserRole) {
  if (isBuildViewStaffRole(role)) {
    return "bg-slate-800 text-white hover:bg-slate-800 dark:bg-slate-200 dark:text-slate-900 dark:hover:bg-slate-200";
  }
  return "bg-slate-100 text-slate-600 ring-1 ring-slate-200/80 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700";
}

export function ProjectTeamSection({ members }: { members: ProjectTeamMember[] }) {
  if (members.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title="No team members yet"
        description="People assigned to this project will appear here with their name and role."
      />
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-500">
        {members.length} team member{members.length === 1 ? "" : "s"} on this project
      </p>
      <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200/80 bg-white dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900/40">
        {members.map((member) => (
          <li
            key={member.assignmentId}
            className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-800/40"
          >
            <Avatar className="h-10 w-10 shrink-0">
              <AvatarImage
                src={member.avatar_url || undefined}
                alt={member.full_name || member.email}
              />
              <AvatarFallback className="bg-slate-100 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                {initials(member.full_name, member.email)}
              </AvatarFallback>
            </Avatar>

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                {member.full_name?.trim() || member.email}
              </p>
              <p className="truncate text-xs text-slate-500">{member.email}</p>
            </div>

            <Badge className={cn("shrink-0 capitalize", roleBadgeClass(member.role))}>
              {USER_ROLE_LABELS[member.role] ?? member.role.replace(/_/g, " ")}
            </Badge>
          </li>
        ))}
      </ul>
    </div>
  );
}
