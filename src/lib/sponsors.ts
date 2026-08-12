export type SponsorPlacement = "trust-strip" | "spotlight";

export interface Sponsor {
  id: string;
  name: string;
  /** Path under /public, e.g. /sponsors/insta360.svg */
  logoSrc?: string;
  href?: string;
  /** Spotlight card copy */
  description?: string;
  placements: SponsorPlacement[];
  active: boolean;
}

/**
 * Homepage sponsor inventory (rendered in HomePartnersSection after hero).
 * Replace logoSrc with approved assets in /public/sponsors/.
 */
export const sponsors: Sponsor[] = [
  {
    id: "insta360",
    name: "Insta360",
    logoSrc: "/sponsors/insta360.svg",
    href: "https://www.insta360.com/enterprise",
    description:
      "Official 360° capture technology for immersive site documentation and remote walkthroughs on BuildView.",
    placements: ["trust-strip", "spotlight"],
    active: true,
  },
  {
    id: "autodesk",
    name: "Autodesk",
    logoSrc: "/sponsors/autodesk.svg",
    href: "https://www.autodesk.com/industry/aec",
    placements: ["trust-strip"],
    active: true,
  },
  {
    id: "procore",
    name: "Procore",
    logoSrc: "/sponsors/procore.svg",
    href: "https://www.procore.com",
    placements: ["trust-strip"],
    active: true,
  },
  {
    id: "trimble",
    name: "Trimble",
    logoSrc: "/sponsors/trimble.svg",
    href: "https://www.trimble.com/en/industries/construction",
    placements: ["trust-strip"],
    active: true,
  },
  {
    id: "ricoh",
    name: "Ricoh",
    logoSrc: "/sponsors/ricoh.svg",
    href: "https://theta360.com",
    placements: ["trust-strip"],
    active: true,
  },
  {
    id: "bentley",
    name: "Bentley",
    logoSrc: "/sponsors/bentley.svg",
    href: "https://www.bentley.com",
    placements: ["trust-strip"],
    active: true,
  },
];

export function getActiveSponsors(): Sponsor[] {
  return sponsors.filter((s) => s.active);
}

export function getSponsorsByPlacement(placement: SponsorPlacement): Sponsor[] {
  return getActiveSponsors().filter((s) => s.placements.includes(placement));
}

export function getSpotlightSponsor(): Sponsor | undefined {
  return getSponsorsByPlacement("spotlight")[0];
}
