import { ShieldOff } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PermissionDeniedProps {
  title?: string;
  message?: string;
  backHref?: string;
  backLabel?: string;
  className?: string;
  variant?: "ops" | "intel";
}

export function PermissionDenied({
  title = "Access restricted",
  message = "You don't have permission to view this content. Contact your administrator if you need access.",
  backHref = "/dashboard",
  backLabel = "Go to dashboard",
  className,
  variant = "intel",
}: PermissionDeniedProps) {
  return (
    <div
      className={cn(
        variant === "intel" ? "intel-card" : "ops-card",
        "flex flex-col items-center px-6 py-16 text-center",
        className
      )}
      role="status"
    >
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 dark:bg-amber-950/40">
        <ShieldOff className="h-7 w-7 text-amber-600 dark:text-amber-400" strokeWidth={1.5} />
      </div>
      <p className="font-display text-base font-semibold text-slate-900 dark:text-white">{title}</p>
      <p className="mt-2 max-w-sm text-sm text-slate-500">{message}</p>
      {backHref && (
        <Button variant="outline" size="sm" className="mt-6" asChild>
          <Link href={backHref}>{backLabel}</Link>
        </Button>
      )}
    </div>
  );
}
