import Image from "next/image";
import type { LucideIcon } from "lucide-react";
import {
  FeatureImageSlider,
  type FeatureSlide,
} from "@/components/marketing/feature-image-slider";
import { cn } from "@/lib/utils";

interface FeatureCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  href?: string;
  className?: string;
  /** Single product screenshot shown under the copy */
  imageSrc?: string;
  imageAlt?: string;
  /** Multiple screenshots — rendered as a labeled slider */
  slides?: FeatureSlide[];
}

export function FeatureCard({
  icon: Icon,
  title,
  description,
  className,
  imageSrc,
  imageAlt,
  slides,
}: FeatureCardProps) {
  const hasMedia = Boolean(imageSrc) || (slides && slides.length > 0);

  return (
    <article
      className={cn(
        "group surface-card flex h-full flex-col overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-xl",
        className
      )}
    >
      {hasMedia && (
        <div className="border-b border-slate-100 p-3 dark:border-slate-800">
          {slides && slides.length > 0 ? (
            <FeatureImageSlider slides={slides} />
          ) : imageSrc ? (
            <div className="relative aspect-16/10 overflow-hidden rounded-xl border border-slate-200/80 bg-slate-100 dark:border-slate-700 dark:bg-slate-900">
              <Image
                src={imageSrc}
                alt={imageAlt ?? title}
                fill
                sizes="(max-width: 768px) 100vw, 33vw"
                className="object-cover object-top"
              />
            </div>
          ) : null}
        </div>
      )}

      <div className="flex flex-1 flex-col p-6">
        <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-accent/10 ring-1 ring-brand-accent/20 transition-colors group-hover:bg-brand-accent/15">
          <Icon className="h-6 w-6 text-brand-accent-dark" strokeWidth={1.75} />
        </div>
        <h3 className="font-display text-lg font-semibold text-brand-primary dark:text-white">
          {title}
        </h3>
        <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
          {description}
        </p>
      </div>
    </article>
  );
}
