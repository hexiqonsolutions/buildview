import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TrackedLink } from "@/components/analytics/tracked-link";
import type { Solution } from "@/lib/marketing/solutions";
import { cn } from "@/lib/utils";

export function SolutionCard({
  solution,
  index,
}: {
  solution: Solution;
  index: number;
}) {
  return (
    <article
      className={cn(
        "group flex h-full flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-soft transition-shadow duration-300 hover:shadow-lift dark:border-slate-800 dark:bg-slate-950",
        "motion-safe:animate-slide-up"
      )}
      style={{ animationDelay: `${index * 80}ms` }}
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-slate-900">
        <Image
          src={solution.imageSrc}
          alt={solution.imageAlt}
          fill
          className="object-cover transition-transform duration-700 group-hover:scale-[1.04]"
          sizes="(max-width: 1024px) 100vw, 33vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/25 to-transparent" />
        <p className="absolute bottom-4 left-5 text-xs font-semibold uppercase tracking-[0.18em] text-brand-accent">
          {String(index + 1).padStart(2, "0")} · {solution.eyebrow}
        </p>
      </div>

      <div className="flex flex-1 flex-col p-6 md:p-7">
        <h3 className="font-display text-xl font-semibold tracking-tight text-brand-primary dark:text-white md:text-2xl">
          {solution.cardHeadline}
        </h3>
        <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
          {solution.cardDescription}
        </p>
        <ul className="mt-5 space-y-2.5">
          {solution.benefits.slice(0, 4).map((item) => (
            <li key={item} className="flex gap-2.5 text-sm text-slate-700 dark:text-slate-300">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-accent-dark" aria-hidden />
              <span>{item}</span>
            </li>
          ))}
        </ul>
        <div className="mt-auto pt-7">
          <Button variant="outline" className="w-full justify-between" asChild>
            <TrackedLink
              href={solution.href}
              eventLabel={`home_solution_${solution.slug}`}
            >
              {solution.ctaLabel}
              <ArrowRight className="h-4 w-4" />
            </TrackedLink>
          </Button>
        </div>
      </div>
    </article>
  );
}

export function SolutionLinkCard({
  title,
  description,
  href,
  imageSrc,
  imageAlt,
}: {
  title: string;
  description: string;
  href: string;
  imageSrc: string;
  imageAlt: string;
}) {
  return (
    <Link
      href={href}
      className="group relative block overflow-hidden rounded-3xl border border-slate-200 bg-slate-950 shadow-soft dark:border-slate-800"
    >
      <div className="relative aspect-[4/3]">
        <Image
          src={imageSrc}
          alt={imageAlt}
          fill
          className="object-cover opacity-80 transition-transform duration-700 group-hover:scale-105"
          sizes="(max-width: 768px) 100vw, 33vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-6">
          <h3 className="font-display text-xl font-semibold text-white">{title}</h3>
          <p className="mt-2 text-sm text-slate-300">{description}</p>
          <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-brand-accent">
            Explore <ArrowRight className="h-4 w-4" />
          </span>
        </div>
      </div>
    </Link>
  );
}
