"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  Users,
  Mail,
  CalendarClock,
  Activity,
  FileText,
  BarChart3,
  Settings,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, ready: true },
  { href: "/leads", label: "Leads", icon: Users, ready: true },
  { href: "/email", label: "Email", icon: Mail, ready: true },
  { href: "/follow-ups", label: "Follow-ups", icon: CalendarClock, ready: true },
  { href: "/activities", label: "Activities", icon: Activity, ready: true },
  { href: "/documents", label: "Documents", icon: FileText, ready: true },
  { href: "/reports", label: "Reports", icon: BarChart3, ready: true },
  { href: "/settings", label: "Settings", icon: Settings, ready: true },
];

type AppSidebarProps = {
  organizationName: string;
  userEmail: string;
  userName: string | null;
  role: string;
};

export function AppSidebar({
  organizationName,
  userEmail,
  userName,
  role,
}: AppSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="flex h-full w-[260px] shrink-0 flex-col border-r border-zinc-800/80 bg-zinc-950/90">
      <div className="border-b border-zinc-800/80 px-5 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500 text-sm font-bold text-black">
            BV
          </div>
          <div className="min-w-0">
            <p className="truncate font-[family-name:var(--font-display)] text-lg font-semibold text-white">
              BuildView
            </p>
            <p className="truncate text-xs text-zinc-500">{organizationName}</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {navItems.map((item) => {
          const active = pathname.startsWith(item.href);
          const Icon = item.icon;

          if (!item.ready) {
            return (
              <div
                key={item.href}
                className="flex items-center justify-between rounded-lg px-3 py-2.5 text-sm text-zinc-600"
                title="Coming in a later module"
              >
                <span className="flex items-center gap-3">
                  <Icon className="size-4" />
                  {item.label}
                </span>
                <span className="text-[10px] uppercase tracking-wider text-zinc-700">
                  Soon
                </span>
              </div>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
                active
                  ? "bg-orange-500/15 text-orange-300"
                  : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100"
              )}
            >
              {active ? (
                <motion.span
                  layoutId="nav-active"
                  className="absolute inset-0 rounded-lg border border-orange-500/25"
                />
              ) : null}
              <Icon className="relative z-10 size-4" />
              <span className="relative z-10">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-zinc-800/80 p-4">
        <div className="mb-3 rounded-xl border border-zinc-800 bg-zinc-900/50 px-3 py-3">
          <p className="truncate text-sm font-medium text-white">
            {userName || "Team member"}
          </p>
          <p className="truncate text-xs text-zinc-500">{userEmail}</p>
          <p className="mt-1 text-[10px] uppercase tracking-[0.16em] text-orange-400/90">
            {role}
          </p>
        </div>
        <Button
          variant="ghost"
          className="w-full justify-start text-zinc-400"
          onClick={signOut}
        >
          <LogOut className="size-4" />
          Sign out
        </Button>
      </div>
    </aside>
  );
}
