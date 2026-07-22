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
    <div className="space-y-8">
      <FadeIn>
        <div className="intel-hero-strip">
          {eyebrow && <p className={typography.eyebrow}>{eyebrow}</p>}
          {!eyebrow && <p className={typography.eyebrow}>Executive Overview</p>}
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{description}</p>
        </div>
      </FadeIn>

      <FadeIn delay={0.05}>
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-white dark:bg-white dark:text-slate-900">
            <Icon className="h-5 w-5" strokeWidth={1.75} />
          </div>
          <div>
            <h1 className={typography.intelPageTitle}>{title}</h1>
          </div>
        </div>
      </FadeIn>

      <FadeIn delay={0.1}>{children}</FadeIn>
    </div>
  );
}
