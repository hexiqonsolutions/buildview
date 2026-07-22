import Link from "next/link";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface PricingTier {
  name: string;
  description: string;
  price: string;
  period: string;
  features: string[];
  cta: string;
  href: string;
  highlighted?: boolean;
  badge?: string;
}

interface PricingCardProps extends PricingTier {
  className?: string;
}

export function PricingCard({
  name,
  description,
  price,
  period,
  features,
  cta,
  href,
  highlighted = false,
  badge,
  className,
}: PricingCardProps) {
  return (
    <article
      className={cn(
        "relative flex flex-col rounded-2xl border p-8 transition-all duration-300",
        highlighted
          ? "border-brand-accent/40 bg-brand-primary text-white shadow-glow ring-1 ring-brand-accent/30"
          : "surface-card border-slate-200/80 dark:border-slate-800",
        className
      )}
    >
      {badge && (
        <span
          className={cn(
            "absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-3 py-1 text-xs font-semibold",
            highlighted
              ? "bg-brand-accent text-brand-primary"
              : "bg-brand-accent/10 text-brand-accent-dark"
          )}
        >
          {badge}
        </span>
      )}

      <div>
        <h3
          className={cn(
            "font-display text-xl font-bold",
            highlighted ? "text-white" : "text-brand-primary dark:text-white"
          )}
        >
          {name}
        </h3>
        <p
          className={cn(
            "mt-2 text-sm leading-relaxed",
            highlighted ? "text-slate-300" : "text-slate-600 dark:text-slate-400"
          )}
        >
          {description}
        </p>
      </div>

      <div className="mt-6 flex items-baseline gap-1">
        <span
          className={cn(
            "font-display text-4xl font-bold tracking-tight",
            highlighted ? "text-white" : "text-brand-primary dark:text-white"
          )}
        >
          {price}
        </span>
        <span className={cn("text-sm", highlighted ? "text-slate-400" : "text-slate-500")}>
          {period}
        </span>
      </div>

      <ul className="mt-8 flex-1 space-y-3">
        {features.map((feature) => (
          <li key={feature} className="flex items-start gap-3 text-sm">
            <Check
              className={cn(
                "mt-0.5 h-4 w-4 shrink-0",
                highlighted ? "text-brand-accent" : "text-brand-accent-dark"
              )}
            />
            <span className={highlighted ? "text-slate-200" : "text-slate-600 dark:text-slate-400"}>
              {feature}
            </span>
          </li>
        ))}
      </ul>

      <Button
        variant={highlighted ? "accent" : "outline"}
        size="lg"
        className={cn("mt-8 w-full", highlighted && "shadow-glow")}
        asChild
      >
        <Link href={href}>{cta}</Link>
      </Button>
    </article>
  );
}
