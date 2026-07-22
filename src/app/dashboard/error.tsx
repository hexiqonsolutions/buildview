"use client";

import { ErrorState } from "@/components/patterns/page-states";

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
      message={error.message || "Something went wrong while loading your portal."}
      onRetry={reset}
      variant="intel"
    />
  );
}
