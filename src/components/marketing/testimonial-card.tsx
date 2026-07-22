import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface TestimonialCardProps {
  quote: string;
  author: string;
  role: string;
  rating?: number;
  className?: string;
}

export function TestimonialCard({
  quote,
  author,
  role,
  rating = 5,
  className,
}: TestimonialCardProps) {
  return (
    <blockquote
      className={cn(
        "surface-card flex h-full flex-col p-6 lg:p-8",
        className
      )}
    >
      <div className="mb-4 flex gap-1">
        {Array.from({ length: rating }).map((_, i) => (
          <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
        ))}
      </div>
      <p className="flex-1 text-base leading-relaxed text-slate-700 dark:text-slate-300">
        &ldquo;{quote}&rdquo;
      </p>
      <footer className="mt-6 border-t border-slate-200/80 pt-5 dark:border-slate-800">
        <cite className="not-italic">
          <p className="font-display font-semibold text-brand-primary dark:text-white">
            {author}
          </p>
          <p className="mt-0.5 text-sm text-slate-500">{role}</p>
        </cite>
      </footer>
    </blockquote>
  );
}
