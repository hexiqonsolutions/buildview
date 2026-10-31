import { matterportShowUrl, getMatterportThumbnailUrl } from "@/lib/matterport";

/** Git-preloaded Matterport model IDs for sales demos. */
export const DEMO_MATTERPORT = {
  construction: "v5TCYAotrVB",
  interior: "q62axSynTRZ",
  realEstate: "Zz8QkH6ps96",
} as const;

export function constructionTourUrl(): string {
  return matterportShowUrl(DEMO_MATTERPORT.construction);
}

export function interiorTourUrl(): string {
  return matterportShowUrl(DEMO_MATTERPORT.interior);
}

export function realEstateTourUrl(): string {
  return matterportShowUrl(DEMO_MATTERPORT.realEstate);
}

export function thumbFor(url: string): string {
  return getMatterportThumbnailUrl(url) ?? "/favicon.png";
}
