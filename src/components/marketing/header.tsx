"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { BrandLogo } from "@/components/brand/brand-logo";
import { Button } from "@/components/ui/button";
import { siteConfig } from "@/lib/site-config";
import { cn } from "@/lib/utils";

export function MarketingHeader() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
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
  }, [pathname]);

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
        <div className="flex h-[4.5rem] items-center justify-between lg:h-20">
          <BrandLogo
            href="/"
            size="xl"
            tone={overHero ? "onDark" : "auto"}
            className="mt-1 max-w-[12rem] overflow-hidden transition-opacity duration-300"
          />

          <nav className="hidden items-center gap-1 lg:flex" aria-label="Main navigation">
            {siteConfig.nav.map((link) => {
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
              <Link href="/contact">Book Demo</Link>
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
              ? "max-h-[28rem] border-t border-slate-200/80 bg-white/95 pb-5 pt-3 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/95"
              : "max-h-0"
          )}
        >
          <nav className="flex flex-col gap-1" aria-label="Mobile navigation">
            {siteConfig.nav.map((link) => {
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
                <Link href="/contact">Book Demo</Link>
              </Button>
            </div>
          </nav>
        </div>
      </div>
    </header>
  );
}
