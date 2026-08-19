"use client";

import { useEffect } from "react";
import { analyticsEvents } from "@/lib/analytics/events";
import { trackEvent } from "@/lib/analytics/track";

export function ViewContentTracker({
  contentName,
  contentCategory = "marketing",
}: {
  contentName: string;
  contentCategory?: string;
}) {
  useEffect(() => {
    trackEvent(analyticsEvents.viewContent, {
      content_name: contentName,
      content_category: contentCategory,
    });
  }, [contentName, contentCategory]);

  return null;
}
