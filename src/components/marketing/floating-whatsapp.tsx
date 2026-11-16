"use client";

import { MessageCircle } from "lucide-react";
import { getWhatsAppUrl } from "@/lib/site-config";
import { cn } from "@/lib/utils";

const DEFAULT_MESSAGE =
  "Hi BuildView, I'd like to learn more about your 360° walkthroughs.";

export function FloatingWhatsApp({
  className,
}: {
  className?: string;
}) {
  return (
    <a
      href={getWhatsAppUrl(DEFAULT_MESSAGE)}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat on WhatsApp"
      className={cn(
        "fixed z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lift",
        "bottom-[max(1.25rem,env(safe-area-inset-bottom))] right-[max(1.25rem,env(safe-area-inset-right))]",
        "mb-16 sm:mb-0",
        "transition-transform hover:scale-105 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2",
        className
      )}
    >
      <MessageCircle className="h-6 w-6" aria-hidden />
    </a>
  );
}
