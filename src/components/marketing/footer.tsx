import Link from "next/link";
import { BrandLogo } from "@/components/brand/brand-logo";
import { Button } from "@/components/ui/button";
import { SocialLinks } from "@/components/marketing/social-links";
import { InstagramFollow } from "@/components/marketing/instagram-follow";
import { TrackedLink } from "@/components/analytics/tracked-link";
import { getWhatsAppUrl, siteConfig } from "@/lib/site-config";
import { Mail, MapPin, MessageCircle, Phone } from "lucide-react";

export function MarketingFooter() {
  return (
    <footer className="border-t border-slate-800 bg-brand-primary text-slate-300">
      <div className="border-b border-slate-800">
        <div className="site-container flex flex-col items-start justify-between gap-6 py-12 lg:flex-row lg:items-center">
          <div className="max-w-xl">
            <h3 className="font-display text-2xl font-bold text-white md:text-3xl">
              Experience Every Space. Understand Every Progress.
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-400">
              Construction intelligence, interior showcases, and real estate virtual tours—powered by
              immersive 360° technology.
            </p>
          </div>
          <Button variant="accent" size="lg" className="shrink-0 shadow-glow" asChild>
            <TrackedLink href="/contact?interest=demo" eventLabel="footer_book_demo">
              Book a Demo
            </TrackedLink>
          </Button>
        </div>
      </div>

      <div className="site-container py-16">
        <div className="grid grid-cols-1 gap-12 md:grid-cols-2 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <BrandLogo href="/" size="lg" tone="onDark" className="mb-5 max-w-44 overflow-hidden" />
            <p className="max-w-sm text-sm leading-relaxed text-slate-400">
              {siteConfig.description}
            </p>
            <SocialLinks className="mt-6" />
            <div className="mt-4">
              <InstagramFollow tone="dark" />
            </div>
          </div>

          <div className="lg:col-span-2">
            <h4 className="mb-4 text-sm font-semibold uppercase tracking-wider text-white">
              Solutions
            </h4>
            <ul className="space-y-2.5 text-sm">
              {siteConfig.footer.solutions.map((item) => (
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
                <a
                  href={`tel:${siteConfig.contact.phone.replace(/\D/g, "")}`}
                  className="transition-colors hover:text-brand-accent"
                >
                  {siteConfig.contact.phone}
                </a>
              </li>
              <li className="flex items-center gap-3">
                <Phone className="h-4 w-4 shrink-0 text-brand-accent" />
                <a
                  href={`tel:${siteConfig.contact.phoneAlt.replace(/\D/g, "")}`}
                  className="transition-colors hover:text-brand-accent"
                >
                  {siteConfig.contact.phoneAlt}
                </a>
              </li>
              <li className="flex items-center gap-3">
                <MessageCircle className="h-4 w-4 shrink-0 text-brand-accent" />
                <a
                  href={getWhatsAppUrl("Hi BuildView, I'd like to learn more about your solutions.")}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="transition-colors hover:text-brand-accent"
                >
                  WhatsApp
                </a>
              </li>
              <li className="flex items-start gap-3">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brand-accent" />
                <span>{siteConfig.contact.address}</span>
              </li>
              <li className="text-slate-500">
                Website:{" "}
                <a
                  href="https://buildview.in"
                  className="text-slate-300 transition-colors hover:text-brand-accent"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  buildview.in
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div className="border-t border-slate-800">
        <div className="site-container flex flex-col gap-4 py-6 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} {siteConfig.name}. All rights reserved.</p>
          <ul className="flex flex-wrap gap-4">
            {siteConfig.footer.legal.map((item) => (
              <li key={item.label}>
                <Link href={item.href} className="transition-colors hover:text-brand-accent">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}
