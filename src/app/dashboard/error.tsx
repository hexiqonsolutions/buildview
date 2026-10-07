"use client";

import { ErrorState } from "@/components/patterns/page-states";
import { getBoundaryMessage } from "@/lib/errors/public";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ErrorState
      title="Dashboard failed to load"
      message={getBoundaryMessage(error, "Something went wrong while loading your portal.")}
      onRetry={reset}
      variant="intel"
    />
  );
}
