export const siteConfig = {
  name: "BuildView",
  brand: {
    /** Logo for white / light backgrounds */
    logo: "/wb-logo.png",
    /** Logo for dark backgrounds */
    logoOnDark: "/db-logo.png",
    ogImage: "/opengraph-image",
  },
  tagline: "Construction Intelligence Platform",
  headline: "See Every Construction Project. Make Every Decision Faster.",
  socialProofLine: "Know what's happening on site, without always being on site.",
  description:
    "BuildView helps developers, architects, contractors and PMCs monitor construction projects remotely with 360° site tours, progress reports, documents, timelines and issue tracking.",
  url:
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    "https://buildview.io",
  seo: {
    title: "BuildView | Construction Monitoring & Intelligence Platform",
    ogTitle: "BuildView | Construction Intelligence Platform",
  },
  contact: {
    email: "buildviewsales@gmail.com",
    phone: "+91 86552 24990",
    phoneAlt: "+91 83693 61785",
    address: "Lok Upvan Phase 2, Thane, Maharashtra, India",
  },
  instagram: {
    handle: "@buildview.360",
    handlePlain: "buildview.360",
    url: "https://www.instagram.com/buildview.360/",
    landingPath: "/links",
    profileName: "BuildView | Construction Tech",
  },
  social: {
    instagram: "https://www.instagram.com/buildview.360/",
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
    { href: "/about", label: "About" },
    { href: "/services", label: "Services" },
    { href: "/projects", label: "Projects" },
    { href: "/contact", label: "Contact" },
  ],
  footer: {
    product: [
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
      { label: "Services", href: "/services" },
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
