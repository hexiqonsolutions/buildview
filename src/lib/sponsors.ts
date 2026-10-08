export type SponsorPlacement = "trust-strip" | "spotlight";

export interface Sponsor {
  id: string;
  name: string;
  /** Path under /public, e.g. /sponsors/insta360.svg */
  logoSrc?: string;
  href?: string;
  kind?: "technology" | "partner";
  /** Spotlight card copy */
  description?: string;
  placements: SponsorPlacement[];
  active: boolean;
}

/**
 * Homepage technology inventory (rendered in HomePartnersSection after hero).
 * Only publish companies BuildView actually uses or partners with.
 * Unverified logos stay inactive so they are not presented as customers or partners.
 */
const sponsors: Sponsor[] = [
  {
    id: "insta360",
    name: "Insta360",
    logoSrc: "/sponsors/insta360.svg",
    href: "https://www.insta360.com/enterprise",
    kind: "technology",
    description:
      "360° capture hardware used for immersive site documentation and remote walkthroughs on BuildView.",
    placements: ["spotlight"],
    active: true,
  },
  {
    id: "autodesk",
    name: "Autodesk",
    logoSrc: "/sponsors/autodesk.svg",
    href: "https://www.autodesk.com/industry/aec",
    placements: ["trust-strip"],
    active: false,
  },
  {
    id: "procore",
    name: "Procore",
    logoSrc: "/sponsors/procore.svg",
    href: "https://www.procore.com",
    placements: ["trust-strip"],
    active: false,
  },
  {
    id: "trimble",
    name: "Trimble",
    logoSrc: "/sponsors/trimble.svg",
    href: "https://www.trimble.com/en/industries/construction",
    placements: ["trust-strip"],
    active: false,
  },
  {
    id: "ricoh",
    name: "Ricoh",
    logoSrc: "/sponsors/ricoh.svg",
    href: "https://theta360.com",
    placements: ["trust-strip"],
    active: false,
  },
  {
    id: "bentley",
    name: "Bentley",
    logoSrc: "/sponsors/bentley.svg",
    href: "https://www.bentley.com",
    placements: ["trust-strip"],
    active: false,
  },
];

function getActiveSponsors(): Sponsor[] {
  return sponsors.filter((s) => s.active);
}

export function getSponsorsByPlacement(placement: SponsorPlacement): Sponsor[] {
  return getActiveSponsors().filter((s) => s.placements.includes(placement));
}

export function getSpotlightSponsor(): Sponsor | undefined {
  return getSponsorsByPlacement("spotlight")[0];
}
