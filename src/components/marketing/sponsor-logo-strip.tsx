import { cn } from "@/lib/utils";
import { getSponsorsByPlacement, type SponsorPlacement } from "@/lib/sponsors";
import { SponsorLogo } from "@/components/marketing/sponsor-logo";

interface SponsorLogoStripProps {
  placement: SponsorPlacement;
  title?: string;
  className?: string;
  variant?: "default" | "muted" | "onDark";
  logoSize?: "sm" | "md" | "lg";
}

const variantClasses = {
  default: "bg-white dark:bg-slate-950",
  muted: "bg-slate-50 dark:bg-slate-900/50",
  onDark: "bg-transparent",
} as const;

const titleClasses = {
  default: "text-slate-500",
  muted: "text-slate-500",
  onDark: "text-slate-500",
} as const;

export function SponsorLogoStrip({
  placement,
  title,
  className,
  variant = "default",
  logoSize = "md",
}: SponsorLogoStripProps) {
  const items = getSponsorsByPlacement(placement);

  if (items.length === 0) {
    return null;
  }

  return (
    <div className={cn(variantClasses[variant], className)}>
      <div className="site-container py-8 md:py-10">
        {title && (
          <p
            className={cn(
              "mb-5 text-center text-[11px] font-semibold uppercase tracking-[0.22em]",
              titleClasses[variant]
            )}
          >
            {title}
          </p>
        )}
        <ul className="flex flex-wrap items-center justify-center gap-x-10 gap-y-6 md:gap-x-14">
          {items.map((sponsor) => (
            <li key={sponsor.id}>
              <SponsorLogo
                sponsor={sponsor}
                variant={variant === "onDark" ? "onDark" : "default"}
                size={logoSize}
              />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
