import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
  variant?: "ops" | "intel";
}

export function ErrorState({
  title = "Something went wrong",
  message = "We couldn't load this content. Please try again.",
  onRetry,
  className,
  variant = "intel",
}: ErrorStateProps) {
  return (
    <div
      className={cn(
        variant === "intel" ? "intel-card" : "ops-card",
        "flex flex-col items-center px-6 py-16 text-center",
        className
      )}
      role="alert"
    >
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 dark:bg-rose-950/40">
        <AlertCircle className="h-7 w-7 text-rose-500" strokeWidth={1.5} />
      </div>
      <p className="font-display text-base font-semibold text-slate-900 dark:text-white">{title}</p>
      <p className="mt-2 max-w-sm text-sm text-slate-500">{message}</p>
      {onRetry && (
        <Button variant="outline" size="sm" className="mt-6" onClick={onRetry}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Try again
        </Button>
      )}
    </div>
  );
}
