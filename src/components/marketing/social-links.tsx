import { Instagram, Linkedin, Twitter, Youtube } from "lucide-react";
import { getPublishedSocialLinks } from "@/lib/site-config";
import { cn } from "@/lib/utils";

const icons = {
  instagram: Instagram,
  linkedin: Linkedin,
  twitter: Twitter,
  youtube: Youtube,
} as const;

interface SocialLinksProps {
  className?: string;
  iconClassName?: string;
}

export function SocialLinks({ className, iconClassName }: SocialLinksProps) {
  const links = getPublishedSocialLinks();
  if (links.length === 0) return null;

  return (
    <div className={cn("flex gap-3", className)}>
      {links.map((link) => {
        const Icon = icons[link.key as keyof typeof icons] ?? Instagram;
        return (
          <a
            key={link.key}
            href={link.href}
            target="_blank"
            rel={link.key === "instagram" ? "noopener noreferrer me" : "noopener noreferrer"}
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-lg border border-slate-700 text-slate-400 transition-colors hover:border-brand-accent/50 hover:text-brand-accent",
              iconClassName
            )}
            aria-label={`BuildView on ${link.label}`}
          >
            <Icon className="h-4 w-4" />
          </a>
        );
      })}
    </div>
  );
}
