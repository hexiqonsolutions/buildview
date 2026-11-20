import Link from "next/link";
import {
  ArrowUpRight,
  Building2,
  Home,
  LogOut,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Sparkles,
} from "lucide-react";
import { BrandLogo } from "@/components/brand/brand-logo";
import { Button } from "@/components/ui/button";
import { signOut } from "@/lib/actions/auth";
import { solutions } from "@/lib/marketing/solutions";
import { getWhatsAppUrl, siteConfig } from "@/lib/site-config";

const SERVICE_ICONS = {
  "construction-intelligence": Building2,
  "real-estate-showcase": Home,
  "interior-showcase": Sparkles,
} as const;

type WelcomeGateProps = {
  userName: string;
  userEmail: string;
};

export function WelcomeGate({ userName, userEmail }: WelcomeGateProps) {
  const { email, emailSales, phone, phoneAlt, address } = siteConfig.contact;
  const firstName = userName.split(" ")[0] || "there";
  const waMessage = `Hi BuildView team, I just signed in as ${userEmail} and would like portal access for my projects.`;
  const mailto = `mailto:${email}?subject=${encodeURIComponent(
    "Portal access request"
  )}&body=${encodeURIComponent(
    `Hi BuildView team,\n\nI signed in with ${userEmail} and would like access to my project dashboard.\n\nThanks,\n${userName}`
  )}`;

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#050505] text-white">
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(164,207,48,0.18), transparent 55%), radial-gradient(ellipse 60% 40% at 100% 100%, rgba(164,207,48,0.08), transparent 50%), linear-gradient(180deg, #0a0a0a 0%, #050505 40%, #0c0c0c 100%)",
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.035]"
        aria-hidden
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.9) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.9) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-6xl flex-col px-5 pb-16 pt-8 sm:px-8 lg:px-10">
        <header className="flex items-center justify-between gap-4">
          <BrandLogo href="/" size="sm" tone="onDark" />
          <form action={signOut}>
            <Button
              type="submit"
              variant="ghost"
              className="h-11 text-white/70 hover:bg-white/5 hover:text-white"
            >
              <LogOut className="mr-2 h-4 w-4" aria-hidden />
              Sign out
            </Button>
          </form>
        </header>

        <main className="mt-10 flex flex-1 flex-col gap-14 lg:mt-14 lg:gap-16">
          <section className="max-w-3xl animate-in fade-in slide-in-from-bottom-2 duration-700">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#a4cf30]">
              Account ready · portal pending
            </p>
            <h1 className="mt-4 text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-[3.25rem] lg:leading-[1.1]">
              Contact BuildView Team
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-relaxed text-white/65 sm:text-lg">
              Hi {firstName} — you&apos;re signed in, but your workspace is not
              assigned yet. Reach out and we&apos;ll link your projects so the
              dashboard opens with your live 360° walkthroughs.
            </p>
            <p className="mt-3 text-sm text-white/40">Signed in as {userEmail}</p>
          </section>

          <section
            aria-labelledby="contact-heading"
            className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]"
          >
            <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-sm sm:p-8">
              <h2 id="contact-heading" className="sr-only">
                Contact details
              </h2>
              <p className="text-sm font-medium text-[#a4cf30]">Talk to us directly</p>
              <ul className="mt-6 space-y-5">
                <li>
                  <a
                    href={mailto}
                    className="group flex items-start gap-4 rounded-2xl transition-colors hover:bg-white/[0.03]"
                  >
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#a4cf30]/15 text-[#a4cf30]">
                      <Mail className="h-5 w-5" aria-hidden />
                    </span>
                    <span>
                      <span className="block text-xs uppercase tracking-wider text-white/40">
                        Email
                      </span>
                      <span className="mt-0.5 block text-base font-medium text-white group-hover:text-[#a4cf30]">
                        {email}
                      </span>
                      <span className="mt-0.5 block text-sm text-white/45">{emailSales}</span>
                    </span>
                  </a>
                </li>
                <li>
                  <a
                    href={`tel:${phone.replace(/\s+/g, "")}`}
                    className="group flex items-start gap-4 rounded-2xl transition-colors hover:bg-white/[0.03]"
                  >
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#a4cf30]/15 text-[#a4cf30]">
                      <Phone className="h-5 w-5" aria-hidden />
                    </span>
                    <span>
                      <span className="block text-xs uppercase tracking-wider text-white/40">
                        Phone
                      </span>
                      <span className="mt-0.5 block text-base font-medium text-white group-hover:text-[#a4cf30]">
                        {phone}
                      </span>
                      <span className="mt-0.5 block text-sm text-white/45">{phoneAlt}</span>
                    </span>
                  </a>
                </li>
                <li className="flex items-start gap-4">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#a4cf30]/15 text-[#a4cf30]">
                    <MapPin className="h-5 w-5" aria-hidden />
                  </span>
                  <span>
                    <span className="block text-xs uppercase tracking-wider text-white/40">
                      Studio
                    </span>
                    <span className="mt-0.5 block text-base font-medium text-white">
                      {address}
                    </span>
                  </span>
                </li>
              </ul>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button
                  asChild
                  className="h-12 flex-1 bg-[#a4cf30] text-[#050505] hover:bg-[#b5e03c]"
                >
                  <a href={getWhatsAppUrl(waMessage)} target="_blank" rel="noopener noreferrer">
                    <MessageCircle className="mr-2 h-4 w-4" aria-hidden />
                    WhatsApp the team
                  </a>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="h-12 flex-1 border-white/20 bg-transparent text-white hover:bg-white/5 hover:text-white"
                >
                  <a href={mailto}>
                    <Mail className="mr-2 h-4 w-4" aria-hidden />
                    Email BuildView
                  </a>
                </Button>
              </div>
            </div>

            <aside className="flex flex-col justify-between gap-6 rounded-3xl border border-[#a4cf30]/25 bg-gradient-to-br from-[#a4cf30]/12 via-transparent to-transparent p-6 sm:p-8">
              <div>
                <p className="text-sm font-medium text-[#a4cf30]">What happens next</p>
                <ol className="mt-5 space-y-4 text-sm leading-relaxed text-white/70">
                  <li className="flex gap-3">
                    <span className="font-mono text-[#a4cf30]">01</span>
                    Tell us which projects or properties need a portal.
                  </li>
                  <li className="flex gap-3">
                    <span className="font-mono text-[#a4cf30]">02</span>
                    We assign your client workspace and project access.
                  </li>
                  <li className="flex gap-3">
                    <span className="font-mono text-[#a4cf30]">03</span>
                    Sign in again — your dashboard unlocks automatically.
                  </li>
                </ol>
              </div>
              <p className="text-xs leading-relaxed text-white/40">
                Already assigned? Refresh this page or sign in again. Access
                updates as soon as our team links your account.
              </p>
            </aside>
          </section>

          <section aria-labelledby="services-heading" className="pb-4">
            <div className="mb-8 max-w-2xl">
              <h2
                id="services-heading"
                className="text-2xl font-semibold tracking-tight text-white sm:text-3xl"
              >
                What BuildView delivers
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-white/55 sm:text-base">
                The same three services from our homepage — ready for your
                construction sites, sales galleries, and interior portfolios.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {solutions.map((solution, index) => {
                const Icon = SERVICE_ICONS[solution.slug];
                return (
                  <article
                    key={solution.slug}
                    className="group flex flex-col rounded-3xl border border-white/10 bg-white/[0.03] p-6 transition-colors duration-300 hover:border-[#a4cf30]/35 hover:bg-white/[0.05]"
                    style={{ animationDelay: `${index * 80}ms` }}
                  >
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#a4cf30]/15 text-[#a4cf30]">
                      <Icon className="h-5 w-5" aria-hidden />
                    </span>
                    <p className="mt-5 text-xs font-semibold uppercase tracking-[0.18em] text-[#a4cf30]/90">
                      {solution.eyebrow}
                    </p>
                    <h3 className="mt-2 text-lg font-semibold leading-snug text-white">
                      {solution.cardHeadline}
                    </h3>
                    <p className="mt-3 flex-1 text-sm leading-relaxed text-white/55">
                      {solution.cardDescription}
                    </p>
                    <Link
                      href={solution.href}
                      className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-[#a4cf30] transition-colors hover:text-[#c5e85a]"
                    >
                      {solution.ctaLabel}
                      <ArrowUpRight className="h-4 w-4" aria-hidden />
                    </Link>
                  </article>
                );
              })}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
