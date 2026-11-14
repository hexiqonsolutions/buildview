"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ChevronDown, Menu, X } from "lucide-react";
import { BrandLogo } from "@/components/brand/brand-logo";
import { Button } from "@/components/ui/button";
import { TrackedLink } from "@/components/analytics/tracked-link";
import { siteConfig } from "@/lib/site-config";
import { cn } from "@/lib/utils";

type NavChild = { href: string; label: string; description?: string };
type NavItem = {
  href: string;
  label: string;
  children?: readonly NavChild[];
};

export function MarketingHeader() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [solutionsOpen, setSolutionsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const isHome = pathname === "/";
  const overHero = isHome && !scrolled && !mobileOpen;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
    setSolutionsOpen(false);
  }, [pathname]);

  const nav = siteConfig.nav as readonly NavItem[];

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
        overHero
          ? "border-b border-transparent bg-transparent"
          : scrolled
            ? "glass-nav glass-nav-scrolled"
            : "glass-nav"
      )}
    >
      <div className="site-container">
        <div className="flex h-18 items-center justify-between lg:h-20">
          <BrandLogo
            href="/"
            size="xl"
            tone={overHero ? "onDark" : "auto"}
            className="mt-1 max-w-48 overflow-hidden transition-opacity duration-300"
          />

          <nav className="hidden items-center gap-1 lg:flex" aria-label="Main navigation">
            {nav.map((link) => {
              if (link.children?.length) {
                const childActive = link.children.some((c) => pathname.startsWith(c.href));
                const isActive = childActive || pathname.startsWith(link.href);
                return (
                  <div key={link.label} className="relative">
                    <button
                      type="button"
                      className={cn(
                        "inline-flex items-center gap-1 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors duration-200",
                        overHero
                          ? cn(
                              "text-white/80 hover:bg-white/10 hover:text-white",
                              isActive && "text-white"
                            )
                          : cn("nav-link", isActive && "nav-link-active")
                      )}
                      aria-expanded={solutionsOpen}
                      aria-haspopup="true"
                      onClick={() => setSolutionsOpen((v) => !v)}
                      onBlur={(e) => {
                        if (!e.currentTarget.parentElement?.contains(e.relatedTarget as Node)) {
                          setSolutionsOpen(false);
                        }
                      }}
                    >
                      {link.label}
                      <ChevronDown
                        className={cn(
                          "h-4 w-4 transition-transform",
                          solutionsOpen && "rotate-180"
                        )}
                      />
                    </button>
                    <div
                      className={cn(
                        "absolute left-1/2 top-full z-50 mt-2 w-[22rem] -translate-x-1/2 rounded-2xl border border-slate-200 bg-white p-2 shadow-lift transition-all dark:border-slate-800 dark:bg-slate-950",
                        solutionsOpen
                          ? "visible opacity-100"
                          : "invisible pointer-events-none opacity-0"
                      )}
                      onMouseDown={(e) => e.preventDefault()}
                    >
                      {link.children.map((child) => (
                        <Link
                          key={child.href}
                          href={child.href}
                          className={cn(
                            "block rounded-xl px-3.5 py-3 transition-colors hover:bg-slate-50 dark:hover:bg-slate-900",
                            pathname.startsWith(child.href) && "bg-brand-accent/10"
                          )}
                          onClick={() => setSolutionsOpen(false)}
                        >
                          <span className="block text-sm font-semibold text-brand-primary dark:text-white">
                            {child.label}
                          </span>
                          {child.description ? (
                            <span className="mt-0.5 block text-xs leading-snug text-slate-500">
                              {child.description}
                            </span>
                          ) : null}
                        </Link>
                      ))}
                      <Link
                        href="/services"
                        className="mt-1 block rounded-xl px-3.5 py-2.5 text-xs font-medium text-brand-accent-dark hover:bg-slate-50 dark:hover:bg-slate-900"
                        onClick={() => setSolutionsOpen(false)}
                      >
                        View platform features →
                      </Link>
                    </div>
                  </div>
                );
              }

              const isActive =
                link.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(link.href);

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "rounded-lg px-3.5 py-2 text-sm font-medium transition-colors duration-200",
                    overHero
                      ? cn(
                          "text-white/80 hover:bg-white/10 hover:text-white",
                          isActive && "text-white"
                        )
                      : cn("nav-link", isActive && "nav-link-active")
                  )}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          <div className="hidden items-center gap-2 lg:flex">
            <Button
              variant="ghost"
              className={cn(
                "transition-colors duration-200",
                overHero
                  ? "text-white hover:bg-white/10 hover:text-white"
                  : "text-slate-700 dark:text-slate-200"
              )}
              asChild
            >
              <Link href="/login">Sign In</Link>
            </Button>
            <Button variant="accent" className="shadow-soft" asChild>
              <TrackedLink href="/contact?interest=demo" eventLabel="header_book_demo">
                Book a Demo
              </TrackedLink>
            </Button>
          </div>

          <button
            type="button"
            className={cn(
              "cursor-pointer rounded-lg p-2 transition-colors lg:hidden",
              overHero
                ? "text-white hover:bg-white/10"
                : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
            )}
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-expanded={mobileOpen}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        <div
          className={cn(
            "overflow-hidden transition-all duration-300 lg:hidden",
            mobileOpen
              ? "max-h-[34rem] border-t border-slate-200/80 bg-white/95 pb-5 pt-3 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/95"
              : "max-h-0"
          )}
        >
          <nav className="flex flex-col gap-1" aria-label="Mobile navigation">
            {nav.map((link) => {
              if (link.children?.length) {
                return (
                  <div key={link.label} className="px-2">
                    <p className="px-2 py-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                      {link.label}
                    </p>
                    {link.children.map((child) => (
                      <Link
                        key={child.href}
                        href={child.href}
                        className={cn(
                          "block rounded-lg px-4 py-2.5 text-sm font-medium transition-colors",
                          pathname.startsWith(child.href)
                            ? "bg-brand-accent/10 text-brand-primary dark:text-white"
                            : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                        )}
                      >
                        {child.label}
                      </Link>
                    ))}
                  </div>
                );
              }

              const isActive =
                link.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(link.href);

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "cursor-pointer rounded-lg px-4 py-2.5 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-brand-accent/10 text-brand-primary dark:text-white"
                      : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                  )}
                >
                  {link.label}
                </Link>
              );
            })}
            <div className="mt-3 flex flex-col gap-2 border-t border-slate-200/80 px-4 pt-4 dark:border-slate-800">
              <Button variant="outline" asChild>
                <Link href="/login">Sign In</Link>
              </Button>
              <Button variant="accent" asChild>
                <TrackedLink href="/contact?interest=demo" eventLabel="header_mobile_book_demo">
                  Book a Demo
                </TrackedLink>
              </Button>
            </div>
          </nav>
        </div>
      </div>
    </header>
  );
}
