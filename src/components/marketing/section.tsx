import { cn } from "@/lib/utils";

type SectionVariant = "default" | "muted" | "dark" | "accent";

const variantClasses: Record<SectionVariant, string> = {
  default: "bg-white dark:bg-slate-950",
  muted: "bg-slate-50 dark:bg-slate-900/50",
  dark: "bg-brand-primary text-white",
  accent: "hero-gradient text-white",
};

interface SectionProps {
  children: React.ReactNode;
  className?: string;
  variant?: SectionVariant;
  id?: string;
  containerClassName?: string;
}

export function Section({
  children,
  className,
  variant = "default",
  id,
  containerClassName,
}: SectionProps) {
  return (
    <section id={id} className={cn("section-padding", variantClasses[variant], className)}>
      <div className={cn("site-container", containerClassName)}>
        {children}
      </div>
    </section>
  );
}
