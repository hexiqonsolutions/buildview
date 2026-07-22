import {
  EmptyState,
  ErrorState,
  PermissionDenied,
  PageLoadingSkeleton,
  Skeleton,
  SkeletonCard,
  SkeletonMetricGrid,
  SurfaceCard,
  FadeIn,
} from "@/design-system/primitives";

export {
  EmptyState,
  ErrorState,
  PermissionDenied,
  PageLoadingSkeleton,
  Skeleton,
  SkeletonCard,
  SkeletonMetricGrid,
  SurfaceCard,
  FadeIn,
};

export type PageState = "loading" | "empty" | "error" | "permission" | "success";

interface PageStateGateProps {
  state: PageState;
  loading?: React.ReactNode;
  empty?: React.ReactNode;
  error?: React.ReactNode;
  permission?: React.ReactNode;
  children: React.ReactNode;
}

/** Renders the correct page state shell before content. */
export function PageStateGate({
  state,
  loading,
  empty,
  error,
  permission,
  children,
}: PageStateGateProps) {
  if (state === "loading") return <>{loading ?? <PageLoadingSkeleton />}</>;
  if (state === "empty") return <>{empty}</>;
  if (state === "error") return <>{error}</>;
  if (state === "permission") return <>{permission}</>;
  return <>{children}</>;
}
