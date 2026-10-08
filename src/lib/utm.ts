type UtmParams = {
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
  utm_content?: string;
};

export const utmCampaigns = {
  instagramProfile: {
    utm_source: "instagram",
    utm_medium: "social",
    utm_campaign: "buildview_profile",
  },
  instagramReels: {
    utm_source: "instagram",
    utm_medium: "social",
    utm_campaign: "buildview_reels",
  },
  instagramBio: {
    utm_source: "instagram",
    utm_medium: "social",
    utm_campaign: "buildview_bio",
  },
  instagramStories: {
    utm_source: "instagram",
    utm_medium: "social",
    utm_campaign: "buildview_stories",
  },
  instagramCarousel: {
    utm_source: "instagram",
    utm_medium: "social",
    utm_campaign: "buildview_carousel",
  },
  facebook: {
    utm_source: "facebook",
    utm_medium: "social",
    utm_campaign: "buildview_facebook",
  },
  linkedin: {
    utm_source: "linkedin",
    utm_medium: "social",
    utm_campaign: "buildview_linkedin",
  },
} as const satisfies Record<string, UtmParams>;

export function withUtm(
  path: string,
  params: UtmParams,
  content?: string
): string {
  const url = new URL(path, "https://buildview.local");
  url.searchParams.set("utm_source", params.utm_source);
  url.searchParams.set("utm_medium", params.utm_medium);
  url.searchParams.set("utm_campaign", params.utm_campaign);
  const utmContent = content ?? params.utm_content;
  if (utmContent) {
    url.searchParams.set("utm_content", utmContent);
  }
  return `${url.pathname}${url.search}${url.hash}`;
}
