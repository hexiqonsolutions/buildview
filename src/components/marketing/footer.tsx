import Link from "next/link";
import { BrandLogo } from "@/components/brand/brand-logo";
import { Button } from "@/components/ui/button";
import { siteConfig } from "@/lib/site-config";
import { Linkedin, Mail, MapPin, Phone, Twitter, Youtube } from "lucide-react";

const socialIcons = {
  linkedin: Linkedin,
  twitter: Twitter,
  youtube: Youtube,
} as const;

export function MarketingFooter() {
  return (
    <footer className="border-t border-slate-800 bg-brand-primary text-slate-300">
      <div className="border-b border-slate-800">
        <div className="site-container flex flex-col items-start justify-between gap-6 py-12 lg:flex-row lg:items-center">
          <div className="max-w-xl">
            <h3 className="font-display text-2xl font-bold text-white md:text-3xl">
              Ready to see your site from anywhere?
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-400">
              Book a walkthrough of BuildView and see how Matterport tours, reports, and
              issue tracking work together in one client portal.
            </p>
          </div>
          <Button variant="accent" size="lg" className="shrink-0 shadow-glow" asChild>
            <Link href="/contact">Schedule a Demo</Link>
          </Button>
        </div>
      </div>

      <div className="site-container py-16">
        <div className="grid grid-cols-1 gap-12 md:grid-cols-2 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <BrandLogo href="/" size="lg" tone="onDark" className="mb-5 max-w-[11rem] overflow-hidden" />
            <p className="max-w-sm text-sm leading-relaxed text-slate-400">
              {siteConfig.description}
            </p>
            <div className="mt-6 flex gap-3">
              {Object.entries(siteConfig.social).map(([key, href]) => {
                const Icon = socialIcons[key as keyof typeof socialIcons];
                return (
                  <a
                    key={key}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-700 text-slate-400 transition-colors hover:border-brand-accent/50 hover:text-brand-accent"
                    aria-label={key}
                  >
                    <Icon className="h-4 w-4" />
                  </a>
                );
              })}
            </div>
          </div>

          <div className="lg:col-span-2">
            <h4 className="mb-4 text-sm font-semibold uppercase tracking-wider text-white">
              Product
            </h4>
            <ul className="space-y-2.5 text-sm">
              {siteConfig.footer.product.map((item) => (
                <li key={item.label}>
                  <Link href={item.href} className="transition-colors hover:text-brand-accent">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="lg:col-span-2">
            <h4 className="mb-4 text-sm font-semibold uppercase tracking-wider text-white">
              Company
            </h4>
            <ul className="space-y-2.5 text-sm">
              {siteConfig.footer.company.map((item) => (
                <li key={item.label}>
                  <Link href={item.href} className="transition-colors hover:text-brand-accent">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="lg:col-span-4">
            <h4 className="mb-4 text-sm font-semibold uppercase tracking-wider text-white">
              Contact
            </h4>
            <ul className="space-y-3 text-sm">
              <li className="flex items-center gap-3">
                <Mail className="h-4 w-4 shrink-0 text-brand-accent" />
                <a
                  href={`mailto:${siteConfig.contact.email}`}
                  className="transition-colors hover:text-brand-accent"
                >
                  {siteConfig.contact.email}
                </a>
              </li>
              <li className="flex items-center gap-3">
                <Phone className="h-4 w-4 shrink-0 text-brand-accent" />
                <span>{siteConfig.contact.phone}</span>
              </li>
              <li className="flex items-start gap-3">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brand-accent" />
                <span>{siteConfig.contact.address}</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-slate-800 pt-8 text-sm text-slate-500 md:flex-row">
          <p>&copy; {new Date().getFullYear()} {siteConfig.name}. All rights reserved.</p>
          <div className="flex flex-wrap justify-center gap-6">
            {siteConfig.footer.legal.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="transition-colors hover:text-brand-accent"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
