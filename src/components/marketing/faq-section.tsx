import { cn } from "@/lib/utils";

interface FaqItem {
  question: string;
  answer: string;
}

interface FaqSectionProps {
  items: FaqItem[];
  className?: string;
}

export function FaqSection({ items, className }: FaqSectionProps) {
  return (
    <div className={cn("mx-auto max-w-3xl space-y-4", className)}>
      {items.map((item) => (
        <details
          key={item.question}
          className="group surface-card overflow-hidden [&_summary::-webkit-details-marker]:hidden"
        >
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-6 font-display font-semibold text-brand-primary transition-colors hover:text-brand-accent-dark dark:text-white">
            {item.question}
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm text-slate-500 transition-transform group-open:rotate-45 dark:bg-slate-800">
              +
            </span>
          </summary>
          <div className="border-t border-slate-200/80 px-6 pb-6 pt-4 text-sm leading-relaxed text-slate-600 dark:border-slate-800 dark:text-slate-400">
            {item.answer}
          </div>
        </details>
      ))}
    </div>
  );
}
