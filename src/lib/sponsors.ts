export type SponsorPlacement = "trust-strip" | "spotlight" | "mid-strip" | "footer";

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
 * Homepage sponsor inventory. Replace logoSrc with files in /public/sponsors/
 * and update entries as partnerships are signed.
 */
export const sponsors: Sponsor[] = [
  {
    id: "insta360",
    name: "Insta360",
    logoSrc: "/sponsors/insta360.svg",
    href: "https://www.insta360.com/enterprise",
    description:
      "Official 360° capture technology for immersive site documentation and remote walkthroughs on BuildView.",
    placements: ["trust-strip", "spotlight", "mid-strip", "footer"],
    active: true,
  },
  {
    id: "autodesk",
    name: "Autodesk",
    logoSrc: "/sponsors/autodesk.svg",
    href: "https://www.autodesk.com/industry/aec",
    placements: ["trust-strip", "mid-strip", "footer"],
    active: true,
  },
  {
    id: "procore",
    name: "Procore",
    logoSrc: "/sponsors/procore.svg",
    href: "https://www.procore.com",
    placements: ["trust-strip", "mid-strip", "footer"],
    active: true,
  },
  {
    id: "trimble",
    name: "Trimble",
    logoSrc: "/sponsors/trimble.svg",
    href: "https://www.trimble.com/en/industries/construction",
    placements: ["trust-strip", "footer"],
    active: true,
  },
  {
    id: "ricoh",
    name: "Ricoh",
    logoSrc: "/sponsors/ricoh.svg",
    href: "https://theta360.com",
    placements: ["trust-strip", "footer"],
    active: true,
  },
  {
    id: "bentley",
    name: "Bentley",
    logoSrc: "/sponsors/bentley.svg",
    href: "https://www.bentley.com",
    placements: ["mid-strip", "footer"],
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
