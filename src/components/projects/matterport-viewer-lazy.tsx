"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type MatterportViewerProps = ComponentProps<
  typeof import("@/components/projects/MatterportViewer").MatterportViewer
>;

function MatterportViewerFallback({
  className,
  aspectRatio = true,
  height = 480,
}: Pick<MatterportViewerProps, "className" | "aspectRatio" | "height">) {
  return (
    <div
      className={cn(
        "flex items-center justify-center bg-slate-100 text-slate-400 dark:bg-slate-900",
        aspectRatio ? "aspect-video w-full" : "w-full",
        className
      )}
      style={aspectRatio ? undefined : { height }}
    >
      <Loader2 className="h-6 w-6 animate-spin" />
    </div>
  );
}

export const MatterportViewerLazy = dynamic(
  () =>
    import("@/components/projects/MatterportViewer").then((mod) => mod.MatterportViewer),
  {
    ssr: false,
    loading: () => <MatterportViewerFallback />,
  }
);
