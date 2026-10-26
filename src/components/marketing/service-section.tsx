import Image from "next/image";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface ServiceSectionProps {
  id: string;
  icon: LucideIcon;
  title: string;
  description: string;
  features: string[];
  reversed?: boolean;
  imageSrc?: string;
  imageAlt?: string;
}

export function ServiceSection({
  id,
  icon: Icon,
  title,
  description,
  features,
  reversed = false,
  imageSrc,
  imageAlt,
}: ServiceSectionProps) {
  return (
    <article id={id} className="scroll-mt-28 py-10 lg:py-12">
      <div
        className={cn(
          "grid items-center gap-6 lg:grid-cols-12 lg:gap-10",
          reversed && "lg:[&>*:first-child]:order-2"
        )}
      >
        <div className="lg:col-span-5">
          <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-brand-accent/10 ring-1 ring-brand-accent/15">
            <Icon className="h-4 w-4 text-brand-accent-dark" strokeWidth={1.75} />
          </div>

          <h2 className="font-display text-xl font-bold tracking-tight text-brand-primary dark:text-white sm:text-2xl">
            {title}
          </h2>

          <p className="mt-2 max-w-sm text-sm leading-relaxed text-slate-600 dark:text-slate-400">
            {description}
          </p>

          {features.length > 0 && (
            <ul className="mt-4 flex flex-wrap gap-2">
              {features.map((feature) => (
                <li
                  key={feature}
                  className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                >
                  {feature}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="lg:col-span-7">
          <div
            className={cn(
              "relative mx-auto w-full max-w-xl overflow-hidden rounded-xl border border-slate-200/80 bg-slate-100 shadow-sm",
              "dark:border-slate-700 dark:bg-slate-900",
              reversed ? "lg:mr-auto lg:ml-0" : "lg:ml-auto lg:mr-0"
            )}
          >
            {imageSrc ? (
              <div className="relative aspect-16/10 w-full">
                <Image
                  src={imageSrc}
                  alt={imageAlt ?? title}
                  fill
                  sizes="(max-width: 1024px) 100vw, 42vw"
                  className="object-cover object-top"
                />
              </div>
            ) : (
              <div className="relative flex aspect-16/10 w-full items-center justify-center">
                <Icon
                  className="h-14 w-14 text-brand-accent/25"
                  strokeWidth={1}
                  aria-hidden
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
