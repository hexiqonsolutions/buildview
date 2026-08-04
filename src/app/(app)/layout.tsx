import { requireAuth } from "@/lib/auth/session";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { FollowUpReminderToaster } from "@/components/follow-ups/follow-up-reminder-toaster";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireAuth();

  return (
    <div className="flex min-h-screen bg-[#0A0A0A] text-zinc-100">
      <div className="hidden md:block">
        <AppSidebar
          organizationName={session.organization.name}
          userEmail={session.user.email}
          userName={session.user.fullName}
          role={session.membership.role}
        />
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="border-b border-zinc-800/80 px-4 py-3 md:hidden">
          <p className="font-[family-name:var(--font-display)] text-lg font-semibold text-white">
            BuildView
          </p>
          <p className="text-xs text-zinc-500">{session.organization.name}</p>
        </div>
        <FollowUpReminderToaster />
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
