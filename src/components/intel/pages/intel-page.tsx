import type { LucideIcon } from "lucide-react";
import { FadeIn } from "@/design-system/primitives/fade-in";
import { typography } from "@/design-system/typography";

interface IntelPageProps {
  title: string;
  description: string;
  icon: LucideIcon;
  eyebrow?: string;
  children: React.ReactNode;
}

/** Client intelligence page chrome — distinct from OpsWorkspacePage. */
export function IntelPage({ title, description, icon: Icon, eyebrow, children }: IntelPageProps) {
  return (
    <div className="space-y-6">
      <FadeIn>
        <div className="intel-hero-strip flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white shadow-soft dark:bg-white dark:text-slate-900">
            <Icon className="h-5 w-5" strokeWidth={1.75} />
          </div>
          <div className="min-w-0">
            {eyebrow ? (
              <p className={typography.eyebrow}>{eyebrow}</p>
            ) : (
              <p className={typography.eyebrow}>Executive Overview</p>
            )}
            <h1 className={`${typography.intelPageTitle} mt-1`}>{title}</h1>
            <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-slate-600 dark:text-slate-400">
              {description}
            </p>
          </div>
        </div>
      </FadeIn>

      <FadeIn delay={0.06}>{children}</FadeIn>
    </div>
  );
}
