import { getSolution } from "@/lib/marketing/solutions";

/** Set true when real logos, numbers, and a testimonial are ready. */
export const SHOW_PROOF = false;

/** Set true when the free sample walkthrough offer is active. */
export const FREE_SAMPLE_OFFER = false;

/**
 * [TODO: I will add the real Matterport or walkthrough embed URLs]
 * Leave empty to show the "Sample coming soon" placeholder.
 */
export const LIVE_WALKTHROUGH_EMBEDS = {
  site: "",
  flat: "",
  interior: "",
} as const;

export const liveWalkthroughTabs = [
  {
    id: "site" as const,
    label: "Site in progress",
    caption: "See a floor under construction, exactly as it stands today.",
  },
  {
    id: "flat" as const,
    label: "Ready flat",
    caption: "Walk a finished home the way a buyer would.",
  },
  {
    id: "interior" as const,
    label: "Finished interior",
    caption: "Explore a completed design down to the last detail.",
  },
];

export const problemCards = [
  {
    title: "Builders and developers",
    body: "Another site update call. Another 40 WhatsApp photos. Still no real picture of what's built.",
  },
  {
    title: "Real estate teams",
    body: "100 leads, one brochure, and no idea who is actually serious.",
  },
  {
    title: "Architects and interior designers",
    body: "Your best work, flattened into a folder of photos.",
  },
];

const construction = getSolution("construction-intelligence");
const realEstate = getSolution("real-estate-showcase");
const interior = getSolution("interior-showcase");

export const homeSolutionCards = [
  {
    slug: construction.slug,
    href: construction.href,
    eyebrow: construction.eyebrow,
    imageSrc: construction.imageSrc,
    imageAlt: construction.imageAlt,
    cardHeadline: "Know what's built without visiting the site.",
    cardDescription:
      "Monthly 360° scans and a built-in progress tracker give every stakeholder the same, verified picture of your project.",
    benefits: [
      "Scans up to 4 times a month, covering up to 10,000 sq ft per floor",
      "Timelines with start and end tracking, and site photos from the engineer's phone",
      "Downloadable progress reports for your team, partners and investors",
    ],
    ctaLabel: "See Construction Intelligence",
  },
  {
    slug: realEstate.slug,
    href: realEstate.href,
    eyebrow: realEstate.eyebrow,
    imageSrc: realEstate.imageSrc,
    imageAlt: realEstate.imageAlt,
    cardHeadline: "Stop sending photos. Let buyers walk in first.",
    cardDescription:
      "Send one link to a ready flat instead of a folder of photos, videos and brochures. Buyers see the real home, and you spend your time on the ones who are serious.",
    benefits: [
      "One walkthrough link for each flat",
      "Send to 100+ leads at once, then follow up where interest is real",
      "Reach buyers and investors beyond your city",
    ],
    ctaLabel: "See Real Estate Showcase",
  },
  {
    slug: interior.slug,
    href: interior.href,
    eyebrow: interior.eyebrow,
    imageSrc: interior.imageSrc,
    imageAlt: interior.imageAlt,
    cardHeadline: "Your finished work, doing the pitching for you.",
    cardDescription:
      "Turn completed projects into walkthroughs that prospective clients can explore on their own. They see the space, the finish and the detail, and you stop explaining.",
    benefits: [
      "A walkthrough for every completed project",
      "A portfolio that feels like being there",
      "Share by link in any proposal or pitch",
    ],
    ctaLabel: "See Interior Showcase",
  },
] as const;

export const progressSteps = [
  {
    step: "01",
    title: "Plan",
    description:
      "Management sets the timeline and deadline for every process, from slab to finishing.",
  },
  {
    step: "02",
    title: "Update",
    description:
      "The site engineer taps Start when a step begins and End when it's done, with photos from their phone.",
  },
  {
    step: "03",
    title: "Verify",
    description:
      "A monthly 360° scan confirms what was actually built, up to 4 times a month.",
  },
  {
    step: "04",
    title: "Report",
    description:
      "Everyone in the organisation sees the same status and can download the report.",
  },
];

export const howItWorksSteps = [
  {
    step: "01",
    title: "Capture",
    description:
      "Our team scans your space on site with professional 360° cameras and Matterport-compatible technology.",
  },
  {
    step: "02",
    title: "Process",
    description: "We turn the scan into a clean, immersive walkthrough.",
  },
  {
    step: "03",
    title: "Enhance",
    description:
      "We add annotations, information tags, hotspots and documentation.",
  },
  {
    step: "04",
    title: "Share",
    description:
      "Send a secure link or give clients access through a portal. They need no app and no training.",
  },
];

export const whyBuildViewItems = [
  {
    title: "Show, don't explain",
    description: "One walkthrough does the work of fifty photos and a long call.",
  },
  {
    title: "See it from anywhere",
    description:
      "Owners, buyers and clients walk the space from any device, in any city.",
  },
  {
    title: "One source of truth",
    description:
      "Timelines, photos and scans live in one place, so everyone sees the same status.",
  },
  {
    title: "Documented by default",
    description:
      "Every stage is recorded and ready to download when you need proof.",
  },
  {
    title: "Close faster",
    description:
      "Clients who have already walked the space arrive more certain and more serious.",
  },
  {
    title: "Look like the best in your market",
    description:
      "A premium first impression that sets you apart from a folder of photos.",
  },
];

type HomeFaqItem = {
  question: string;
  answer: string | null;
  /** Hide until the free-sample offer flag is on */
  requiresFreeSample?: boolean;
};

/**
 * Answers marked null are still [TODO] and must not render.
 * - How long does a scan take? [TODO: I will provide the typical time per floor or flat]
 * - Who can see our walkthroughs? partial — confirm exact access controls [TODO]
 * - How does pricing work? [TODO: I will provide the starting price or package structure]
 * - Can we try it first? [TODO: shown only if FREE_SAMPLE_OFFER]
 */
const homeFaqSource: HomeFaqItem[] = [
  {
    question: "How long does a scan take?",
    // [TODO: I will provide the typical time per floor or flat]
    answer: null,
  },
  {
    question: "Do we need special equipment or training?",
    answer:
      "No. Our team captures the space on site, and you view it in a browser on any phone or computer.",
  },
  {
    question: "Who can see our walkthroughs?",
    // [TODO: confirm exact access controls]
    answer:
      "Only the people you share the link or portal access with.",
  },
  {
    question: "Can our site engineers use it from a phone?",
    answer:
      "Yes. They tap Start and End on each step and attach photos right from their mobile.",
  },
  {
    question: "How does pricing work?",
    // [TODO: I will provide the starting price or package structure]
    answer: null,
  },
  {
    question: "Can we try it first?",
    // [TODO: shown only if I enable the free sample offer]
    answer: null,
    requiresFreeSample: true,
  },
];

export function getVisibleHomeFaqs() {
  return homeFaqSource
    .filter((item) => {
      if (item.requiresFreeSample && !FREE_SAMPLE_OFFER) return false;
      return Boolean(item.answer);
    })
    .map((item) => ({
      question: item.question,
      answer: item.answer as string,
    }));
}

/**
 * [TODO proof strip content — keep hidden while SHOW_PROOF is false]
 * - 2–3 client logos or names
 * - three numbers: projects scanned, sq ft captured, walkthroughs shared
 * - one testimonial with name, role and company
 */
export const proofStripPlaceholders = {
  logos: [] as { name: string; src?: string }[],
  stats: [] as { label: string; value: string }[],
  testimonial: null as {
    quote: string;
    name: string;
    role: string;
    company: string;
  } | null,
};
