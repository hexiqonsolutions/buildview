export const siteConfig = {
  name: "BuildView",
  brand: {
    logo: "/logo.png",
    logoOnDark: "/logo-white-01.png",
  },
  tagline: "Monitor construction progress from anywhere",
  description:
    "Immersive Matterport virtual tours, progress reports, document management, and issue tracking — built for developers, contractors, and project owners.",
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
    { href: "/pricing", label: "Pricing" },
    { href: "/contact", label: "Contact" },
  ],
  footer: {
    product: [
      { label: "Virtual Tours", href: "/services#virtual-tours" },
      { label: "Progress Reports", href: "/services#reports" },
      { label: "Document Hub", href: "/services#documents" },
      { label: "Issue Tracking", href: "/services#issues" },
      { label: "Project Timeline", href: "/services#timeline" },
      { label: "Pricing", href: "/pricing" },
    ],
    company: [
      { label: "About", href: "/about" },
      { label: "Projects", href: "/projects" },
      { label: "Contact", href: "/contact" },
    ],
    legal: [
      { label: "Privacy Policy", href: "/privacy" },
      { label: "Terms of Service", href: "/terms" },
      { label: "Cookie Policy", href: "/cookies" },
    ],
  },
} as const;
