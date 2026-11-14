/**
 * Marketing solutions (three verticals). Source of truth for nav, homepage cards,
 * service pages, and contact-form interest options.
 */

export type SolutionSlug =
  | "construction-intelligence"
  | "real-estate-showcase"
  | "interior-showcase";

export type SolutionInterest =
  | "construction"
  | "real-estate"
  | "interior"
  | "demo"
  | "quote"
  | "enterprise"
  | "matterport"
  | "partnership"
  | "support"
  | "other";

export const solutions = [
  {
    slug: "construction-intelligence" as const,
    href: "/construction-intelligence",
    navLabel: "Construction Intelligence",
    shortLabel: "Construction",
    interest: "construction" as const,
    eyebrow: "Construction Intelligence",
    cardHeadline: "See Project. Track Every Detail.",
    cardDescription:
      "Bring your entire construction site into a digital environment. Monitor project progress, document site conditions, compare development stages, and collaborate with stakeholders through immersive 360° walkthroughs and our project management system.",
    benefits: [
      "Complete 360° project walkthroughs",
      "Remote site monitoring",
      "Visual project progress tracking",
      "Project documentation",
      "Quality inspection and snag identification",
      "Better coordination between stakeholders",
    ],
    ctaLabel: "Explore Construction Intelligence",
    demoCta: "Request a Construction Demo",
    imageSrc: "/marketing/why-buildview/project-scans.jpg",
    imageAlt: "360° construction site walkthrough in BuildView",
    accentClass: "from-slate-900 via-slate-800 to-slate-900",
    seo: {
      title: "Construction Intelligence | 360° Site Monitoring",
      description:
        "Monitor construction projects with immersive 360° walkthroughs, progress documentation, reports, issues, and stakeholder collaboration in BuildView.",
    },
  },
  {
    slug: "real-estate-showcase" as const,
    href: "/real-estate-showcase",
    navLabel: "Real Estate Showcase",
    shortLabel: "Real Estate",
    interest: "real-estate" as const,
    eyebrow: "Real Estate Showcase",
    cardHeadline: "Let Buyers Experience Properties.",
    cardDescription:
      "Give potential buyers and investors an immersive virtual experience of your property. Showcase apartments, sample flats, villas, commercial spaces, and completed developments through interactive 360° walkthroughs.",
    benefits: [
      "Virtual property tours",
      "Showcase sample flats and model apartments",
      "Remote property presentations",
      "Reach buyers beyond geographical boundaries",
      "Reduce unnecessary initial site visits",
      "Improve property marketing presentations",
    ],
    ctaLabel: "Explore Real Estate Showcase",
    demoCta: "Request a Property Showcase Demo",
    imageSrc: "/marketing/services/dashboard.jpg",
    imageAlt: "Premium property presentation visual for real estate tours",
    accentClass: "from-zinc-950 via-zinc-900 to-zinc-950",
    seo: {
      title: "Real Estate Showcase | 360° Virtual Property Tours",
      description:
        "Showcase residential and commercial properties with immersive 360° virtual tours. Engage remote buyers and support sales presentations.",
    },
  },
  {
    slug: "interior-showcase" as const,
    href: "/interior-showcase",
    navLabel: "Interior Showcase",
    shortLabel: "Interiors",
    interest: "interior" as const,
    eyebrow: "Interior Showcase",
    cardHeadline: "Let Designs Speak for Themselves.",
    cardDescription:
      "Showcase your completed interior projects through immersive 360° virtual walkthroughs. Instead of sharing hundreds of photographs and videos, let potential clients explore every corner of your design in an interactive digital experience.",
    benefits: [
      "Interactive 360° interior walkthroughs",
      "Showcase completed projects",
      "Present design details and spatial layouts",
      "Create a premium digital portfolio",
      "Share projects with clients through a link",
      "Improve client engagement and presentations",
    ],
    ctaLabel: "Explore Interior Showcase",
    demoCta: "Showcase Your Interior Projects",
    imageSrc: "/marketing/services/virtual-tours.jpg",
    imageAlt: "Immersive interior space walkthrough placeholder visual",
    accentClass: "from-stone-900 via-neutral-800 to-stone-900",
    seo: {
      title: "Interior Showcase | 360° Virtual Design Portfolio",
      description:
        "Transform completed interiors into interactive 360° walkthroughs. Build a shareable virtual portfolio for designers, architects, and studios.",
    },
  },
] as const;

export type Solution = (typeof solutions)[number];

export function getSolution(slug: SolutionSlug): Solution {
  const found = solutions.find((s) => s.slug === slug);
  if (!found) throw new Error(`Unknown solution: ${slug}`);
  return found;
}

export function contactHrefForSolution(interest: SolutionInterest): string {
  return `/contact?interest=${encodeURIComponent(interest)}`;
}
