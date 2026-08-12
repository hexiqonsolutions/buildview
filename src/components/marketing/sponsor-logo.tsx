import Image from "next/image";
import { cn } from "@/lib/utils";
import type { Sponsor } from "@/lib/sponsors";

interface SponsorLogoProps {
  sponsor: Sponsor;
  className?: string;
  variant?: "default" | "onDark";
  size?: "sm" | "md" | "lg";
}

const sizeClasses = {
  sm: { box: "h-8 max-w-[5.5rem]", text: "text-xs", image: "h-7" },
  md: { box: "h-9 max-w-[7.5rem]", text: "text-sm", image: "h-8" },
  lg: { box: "h-11 max-w-[9rem]", text: "text-base", image: "h-10" },
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
        "w-auto max-w-full object-contain object-center",
        sizeClasses[size].image,
        variant === "default" &&
          "opacity-70 grayscale transition-all duration-200 motion-reduce:transition-none group-hover:opacity-100 group-hover:grayscale-0",
        variant === "onDark" &&
          "opacity-55 brightness-200 grayscale transition-all duration-200 motion-reduce:transition-none group-hover:opacity-90 group-hover:grayscale-0"
      )}
    />
  ) : (
    <SponsorWordmark name={sponsor.name} size={size} variant={variant} />
  );

  const inner = (
    <div
      className={cn(
        "group flex w-full items-center justify-center",
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
      className={cn(
        "flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-lg outline-none",
        "transition-opacity duration-200 motion-reduce:transition-none",
        "focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2"
      )}
      aria-label={`Visit ${sponsor.name} (partner)`}
    >
      {inner}
    </a>
  );
}
