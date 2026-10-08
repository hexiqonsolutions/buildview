import { LogOut, Mail, Phone, ShieldAlert } from "lucide-react";
import { BrandLogo } from "@/components/brand/brand-logo";
import { Button } from "@/components/ui/button";
import { signOut } from "@/lib/actions/auth";
import { CLIENT_SUSPENDED_MESSAGE } from "@/lib/auth/client-suspension";
import { siteConfig } from "@/lib/site-config";

export function AccountSuspended({ userName }: { userName: string }) {
  const { email, phone } = siteConfig.contact;
  const mailto = `mailto:${email}?subject=${encodeURIComponent("Account suspended - payment")}`;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-slate-50 px-6 py-12 dark:bg-slate-950">
      <BrandLogo href="/" size="sm" />

      <div className="w-full max-w-md rounded-2xl border border-amber-200 bg-white p-8 text-center shadow-sm dark:border-amber-500/30 dark:bg-slate-900">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400">
          <ShieldAlert className="h-7 w-7" aria-hidden />
        </div>

        <h1 className="text-xl font-semibold text-slate-900 dark:text-white">
          Account suspended
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Hi {userName},</p>
        <p className="mt-4 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
          {CLIENT_SUSPENDED_MESSAGE} Your projects will be available again as soon as your
          account is reactivated.
        </p>

        <div className="mt-6 space-y-2 rounded-xl bg-slate-50 p-4 text-left text-sm dark:bg-slate-800/60">
          <p className="font-medium text-slate-900 dark:text-white">Contact BuildView accounts</p>
          <a
            href={mailto}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
          >
            <Mail className="h-4 w-4" aria-hidden />
            {email}
          </a>
          <a
            href={`tel:${phone.replace(/\s+/g, "")}`}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
          >
            <Phone className="h-4 w-4" aria-hidden />
            {phone}
          </a>
        </div>

        <form action={signOut} className="mt-6">
          <Button type="submit" variant="outline" className="w-full">
            <LogOut className="mr-2 h-4 w-4" aria-hidden />
            Sign out
          </Button>
        </form>
      </div>
    </div>
  );
}
