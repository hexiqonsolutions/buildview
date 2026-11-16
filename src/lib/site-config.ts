import { solutions } from "@/lib/marketing/solutions";

export const siteConfig = {
  name: "BuildView",
  brand: {
    /** Logo for white / light backgrounds */
    logo: "/wb-logo.png",
    /** Logo for dark backgrounds */
    logoOnDark: "/db-logo.png",
    ogImage: "/opengraph-image",
  },
  tagline: "Stop explaining, Start Showing",
  headline: "Stop explaining, Start Showing",
  socialProofLine: "Built for builders, real estate teams, architects and interior designers.",
  description:
    "Show sites, flats and finished interiors as 360° walkthroughs. Track construction progress, sell properties faster and win design clients. Book a demo.",
  url:
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    "https://buildview.in",
  seo: {
    title: "BuildView | 360° Walkthroughs for Construction, Real Estate & Interiors",
    ogTitle: "BuildView | 360° Walkthroughs for Construction, Real Estate & Interiors",
  },
  contact: {
    email: "buildview360@gmail.com",
    /** Existing sales inbox retained for continuity */
    emailSales: "buildviewsales@gmail.com",
    phone: "+91 86552 24990",
    phoneAlt: "+91 83693 61785",
    address: "Lok Upvan Phase 2, Thane, Maharashtra, India",
    /** WhatsApp uses the primary verified sales number */
    whatsappE164: "918655224990",
  },
  instagram: {
    handle: "@build_view360",
    handlePlain: "build_view360",
    url: "https://www.instagram.com/build_view360/",
    landingPath: "/links",
    profileName: "BuildView | 360° Experiences",
  },
  social: {
    instagram: "https://www.instagram.com/build_view360/",
    /**
     * Add official company URLs only after they are verified.
     * Generic / placeholder profiles must not be published.
     */
    linkedin: "" as string,
    twitter: "" as string,
    youtube: "" as string,
  },
  nav: [
    { href: "/", label: "Home" },
    {
      href: "/services",
      label: "Solutions",
      children: solutions.map((s) => ({
        href: s.href,
        label: s.navLabel,
        description: s.cardHeadline,
      })),
    },
    { href: "/about", label: "About" },
    { href: "/contact", label: "Contact" },
  ],
  footer: {
    solutions: solutions.map((s) => ({ label: s.navLabel, href: s.href })),
    features: [
      { label: "Virtual Tours", href: "/services#virtual-tours" },
      { label: "Compare Progress", href: "/services#compare-tours" },
      { label: "Progress Reports", href: "/services#reports" },
      { label: "Document Hub", href: "/services#documents" },
      { label: "Issue Tracking", href: "/services#issues" },
      { label: "Project Timeline", href: "/services#timeline" },
      { label: "Client Dashboard", href: "/services#dashboard" },
    ],
    company: [
      { label: "About", href: "/about" },
      { label: "Projects", href: "/projects" },
      { label: "Platform", href: "/services" },
      { label: "Contact", href: "/contact" },
    ],
    legal: [
      { label: "Privacy Policy", href: "/privacy" },
      { label: "Terms of Service", href: "/terms" },
      { label: "Cookie Policy", href: "/cookies" },
    ],
  },
} as const;

export function getPublishedSocialLinks(): { key: string; href: string; label: string }[] {
  const labels: Record<string, string> = {
    instagram: "Instagram",
    linkedin: "LinkedIn",
    twitter: "X",
    youtube: "YouTube",
  };

  return Object.entries(siteConfig.social)
    .filter(([, href]) => Boolean(href))
    .map(([key, href]) => ({
      key,
      href,
      label: labels[key] ?? key,
    }));
}

export function getWhatsAppUrl(message?: string): string {
  const base = `https://wa.me/${siteConfig.contact.whatsappE164}`;
  if (!message) return base;
  return `${base}?text=${encodeURIComponent(message)}`;
}
