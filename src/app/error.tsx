"use client";

import Link from "next/link";
import { ErrorState } from "@/components/patterns/page-states";
import { Button } from "@/components/ui/button";
import { getBoundaryMessage } from "@/lib/errors/public";

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-50 px-6 dark:bg-slate-950">
      <ErrorState
        className="w-full max-w-md"
        message={getBoundaryMessage(error, "We couldn't load this page. Please try again.")}
        onRetry={reset}
        variant="ops"
      />
      <Button variant="ghost" size="sm" asChild>
        <Link href="/">Back to home</Link>
      </Button>
    </div>
  );
}
