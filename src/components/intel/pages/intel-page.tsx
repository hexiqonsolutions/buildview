import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { FadeIn } from "@/design-system/primitives/fade-in";
import { typography } from "@/design-system/typography";
import { cn } from "@/lib/utils";

interface IntelPageProps {
  title: string;
  description?: string;
  icon: LucideIcon;
  /** Section label under the icon. Omit to hide. */
  eyebrow?: string;
  /** Optional actions aligned to the right of the header. */
  actions?: React.ReactNode;
  /** Optional back link above the title row. */
  backHref?: string;
  backLabel?: string;
  className?: string;
  children: React.ReactNode;
}

/** Canonical client-portal page chrome — use on every non-home dashboard route. */
export function IntelPage({
  title,
  description,
  icon: Icon,
  eyebrow,
  actions,
  backHref,
  backLabel = "Back",
  className,
  children,
}: IntelPageProps) {
  return (
    <div className={cn("space-y-6", className)}>
      {backHref && (
        <FadeIn>
          <Link
            href={backHref}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition-colors hover:text-slate-800 dark:hover:text-slate-200"
          >
            <ArrowLeft className="h-4 w-4" />
            {backLabel}
          </Link>
        </FadeIn>
      )}

      <FadeIn>
        <div className="intel-hero-strip flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900">
              <Icon className="h-5 w-5" strokeWidth={1.75} />
            </div>
            <div className="min-w-0">
              {eyebrow ? <p className={typography.eyebrow}>{eyebrow}</p> : null}
              <h1 className={cn(typography.intelPageTitle, eyebrow && "mt-1")}>{title}</h1>
              {description ? (
                <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                  {description}
                </p>
              ) : null}
            </div>
          </div>
          {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
        </div>
      </FadeIn>

      <FadeIn delay={0.05}>{children}</FadeIn>
    </div>
  );
}
