import { Instagram } from "lucide-react";
import { siteConfig } from "@/lib/site-config";
import { cn } from "@/lib/utils";

interface InstagramFollowProps {
  className?: string;
  tone?: "light" | "dark";
}

export function InstagramFollow({
  className,
  tone = "light",
}: InstagramFollowProps) {
  const isDark = tone === "dark";

  return (
    <a
      href={siteConfig.instagram.url}
      target="_blank"
      rel="noopener noreferrer me"
      className={cn(
        "inline-flex items-center gap-2 text-sm font-medium transition-colors",
        isDark
          ? "text-slate-300 hover:text-brand-accent"
          : "text-slate-600 hover:text-brand-accent-dark dark:text-slate-400",
        className
      )}
    >
      <Instagram className="h-4 w-4" />
      Follow {siteConfig.instagram.handle}
    </a>
  );
}
