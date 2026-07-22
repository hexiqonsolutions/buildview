import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { BrandLogo } from "@/components/brand/brand-logo";

const highlights = [
  "Matterport virtual tours in every project",
  "Progress reports & document hub",
  "Issue tracking with photo evidence",
  "Secure client & admin portals",
];

interface AuthShellProps {
  children: React.ReactNode;
}

export function AuthShell({ children }: AuthShellProps) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden overflow-hidden mesh-gradient text-white lg:flex lg:flex-col lg:justify-between">
        <div className="dot-pattern absolute inset-0 opacity-30" />
        <div className="relative site-px py-10 xl:py-14">
          <BrandLogo href="/" size="lg" tone="onDark" className="max-w-[11rem] overflow-hidden" />
          <h1 className="mt-12 font-display text-3xl font-bold leading-tight xl:text-4xl">
            Construction visibility,
            <br />
            <span className="gradient-text">delivered professionally.</span>
          </h1>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-slate-300">
            Access your projects, virtual tours, reports, and documents from a single
            secure portal built for construction teams.
          </p>
          <ul className="mt-10 space-y-3">
            {highlights.map((item) => (
              <li key={item} className="flex items-start gap-3 text-sm text-slate-300">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand-accent" />
                {item}
              </li>
            ))}
          </ul>
        </div>
        <div className="relative site-px border-t border-white/10 py-6 text-xs text-slate-500">
          <Link href="/" className="transition-colors hover:text-brand-accent">
            ← Back to buildview.io
          </Link>
        </div>
      </div>

      <div className="flex flex-col bg-white dark:bg-slate-950">
        <div className="site-px flex items-center justify-between py-6 lg:hidden">
          <BrandLogo href="/" size="md" tone="default" className="max-w-[10rem] overflow-hidden" />
          <Link
            href="/"
            className="text-xs font-medium text-slate-500 transition-colors hover:text-brand-accent"
          >
            Home
          </Link>
        </div>
        <div className="flex flex-1 items-center justify-center site-px py-8 lg:py-12">
          <div className="w-full max-w-md">
            <div className="surface-card p-8 lg:p-10">{children}</div>
            <p className="mt-6 text-center text-xs text-slate-400">
              Protected by enterprise-grade encryption. By signing in you agree to our{" "}
              <Link href="/terms" className="underline hover:text-brand-accent">
                Terms
              </Link>{" "}
              and{" "}
              <Link href="/privacy" className="underline hover:text-brand-accent">
                Privacy Policy
              </Link>
              .
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
