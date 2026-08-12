import Image from "next/image";
import { cn } from "@/lib/utils";
import type { Sponsor } from "@/lib/sponsors";

interface SponsorLogoProps {
  sponsor: Sponsor;
  className?: string;
  /** Footer uses light logos on dark background */
  variant?: "default" | "onDark";
  size?: "sm" | "md" | "lg";
}

const sizeClasses = {
  sm: { box: "h-8 max-w-[5.5rem]", text: "text-xs" },
  md: { box: "h-9 max-w-[7rem]", text: "text-sm" },
  lg: { box: "h-11 max-w-[8.5rem]", text: "text-base" },
} as const;

function SponsorWordmark({
  name,
  size,
  variant,
}: {
  name: string;
  size: keyof typeof sizeClasses;
  variant: "default" | "onDark";
}) {
  return (
    <span
      className={cn(
        "font-display font-semibold tracking-tight",
        sizeClasses[size].text,
        variant === "onDark" ? "text-slate-400" : "text-slate-500"
      )}
    >
      {name}
    </span>
  );
}

export function SponsorLogo({
  sponsor,
  className,
  variant = "default",
  size = "md",
}: SponsorLogoProps) {
  const content = sponsor.logoSrc ? (
    <Image
      src={sponsor.logoSrc}
      alt={`${sponsor.name} logo`}
      width={140}
      height={44}
      className={cn(
        "h-auto w-full object-contain object-center",
        variant === "default" &&
          "opacity-60 grayscale transition-all duration-300 group-hover:opacity-100 group-hover:grayscale-0",
        variant === "onDark" &&
          "opacity-50 brightness-200 grayscale transition-all duration-300 group-hover:opacity-90 group-hover:grayscale-0"
      )}
    />
  ) : (
    <SponsorWordmark name={sponsor.name} size={size} variant={variant} />
  );

  const inner = (
    <div
      className={cn(
        "group flex items-center justify-center",
        sponsor.logoSrc && sizeClasses[size].box,
        className
      )}
    >
      {content}
    </div>
  );

  if (!sponsor.href) {
    return inner;
  }

  return (
    <a
      href={sponsor.href}
      target="_blank"
      rel="sponsored noopener noreferrer"
      className="rounded-lg outline-none transition-opacity focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2"
      aria-label={`Visit ${sponsor.name}`}
    >
      {inner}
    </a>
  );
}
