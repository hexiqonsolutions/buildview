export const siteConfig = {
  name: "BuildView",
  brand: {
    /** Logo for white / light backgrounds */
    logo: "/wb-logo.png",
    /** Logo for dark backgrounds */
    logoOnDark: "/db-logo.png",
  },
  tagline: "Construction Intelligence Platform",
  description:
    "Monitor construction projects with 360° virtual site tours, progress reports, document management, issue tracking, and timelines. Built for developers, architects, contractors, and PMCs.",
  url:
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    "https://buildview.io",
  contact: {
    email: "hello@buildview.io",
    phone: "+91 98765 43210",
    address: "123 Construction Ave, Suite 400, San Francisco, CA 94105",
  },
  social: {
    linkedin: "https://linkedin.com/company/buildview",
    twitter: "https://twitter.com/buildview",
    youtube: "https://youtube.com/@buildview",
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
