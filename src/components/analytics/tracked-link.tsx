"use client";

import Link from "next/link";
import type { ComponentProps } from "react";
import { trackCtaClick } from "@/lib/analytics/track";

type TrackedLinkProps = ComponentProps<typeof Link> & {
  eventLabel: string;
};

export function TrackedLink({
  eventLabel,
  href,
  onClick,
  ...props
}: TrackedLinkProps) {
  return (
    <Link
      href={href}
      onClick={(event) => {
        trackCtaClick(eventLabel, String(href));
        onClick?.(event);
      }}
      {...props}
    />
  );
}
