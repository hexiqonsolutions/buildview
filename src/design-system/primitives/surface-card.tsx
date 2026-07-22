import { cn } from "@/lib/utils";

type SurfaceVariant = "ops" | "intel" | "neutral";

interface SurfaceCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: SurfaceVariant;
  hover?: boolean;
}

const variantClass: Record<SurfaceVariant, string> = {
  ops: "ops-card",
  intel: "intel-card",
  neutral: "rounded-2xl border border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-900",
};

export function SurfaceCard({
  variant = "neutral",
  hover = false,
  className,
  children,
  ...props
}: SurfaceCardProps) {
  return (
    <div
      className={cn(
        variantClass[variant],
        hover && variant === "intel" && "transition-shadow hover:shadow-[0_12px_40px_rgba(15,23,42,0.08)]",
        hover && variant === "ops" && "transition-shadow hover:shadow-[0_8px_28px_rgba(15,23,42,0.08)]",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
