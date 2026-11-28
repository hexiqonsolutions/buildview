/**
 * Traffic classification for first-party analytics (pure, tested).
 * Bots / link previews, device class, traffic source and UTM parsing.
 */

/** A new visit starts after this much inactivity. */
export const VISIT_WINDOW_MS = 30 * 60 * 1000;
/** Cap on counted active time per visit (a tab left open overnight). */
export const MAX_ACTIVE_SECONDS = 4 * 60 * 60;
/** Most seconds one heartbeat may add. */
export const MAX_HEARTBEAT_SECONDS = 60;

const PREVIEW_BOTS: [RegExp, string][] = [
  [/whatsapp/i, "WhatsApp"],
  [/facebookexternalhit|facebot|meta-externalagent/i, "Facebook"],
  // Not "Instagram": its in-app browser (real people) carries that token.
  [/twitterbot/i, "X / Twitter"],
  [/linkedinbot/i, "LinkedIn"],
  [/slackbot|slack-imgproxy/i, "Slack"],
  [/telegrambot/i, "Telegram"],
  [/discordbot/i, "Discord"],
  [/skypeuripreview|msteams|microsoftpreview/i, "Microsoft"],
  [/googlebot|google-inspectiontool|adsbot-google|mediapartners-google/i, "Google"],
  [/bingbot|bingpreview/i, "Bing"],
  [/applebot/i, "Apple"],
];

const GENERIC_BOT = /bot|crawl|spider|slurp|preview|fetch|headless|lighthouse|pingdom|uptime|monitor|curl|wget|python-requests|axios|node-fetch|go-http-client/i;

/** Link preview / crawler source, or null for a person. */
export function botSource(userAgent: string | null | undefined): string | null {
  const ua = userAgent ?? "";
  if (!ua.trim()) return "Unknown bot";
  for (const [re, name] of PREVIEW_BOTS) if (re.test(ua)) {
    // WhatsApp's in-app browser for people says "WhatsApp" too only with mobile Safari/Chrome tokens.
    if (name === "WhatsApp" && /mozilla\/5\.0/i.test(ua) && /mobile/i.test(ua) && !/whatsapp\/\d/i.test(ua)) return null;
    return name;
  }
  return GENERIC_BOT.test(ua) ? "Other bot" : null;
}

export function deviceClass(userAgent: string | null | undefined): "mobile" | "tablet" | "desktop" {
  const ua = userAgent ?? "";
  if (/ipad|tablet|(android(?!.*mobile))/i.test(ua)) return "tablet";
  if (/mobi|iphone|ipod|android/i.test(ua)) return "mobile";
  return "desktop";
}

export function referrerHost(referrer: string | null | undefined, ownHost?: string | null): string | null {
  if (!referrer) return null;
  try {
    const host = new URL(referrer).hostname.replace(/^www\./, "").toLowerCase();
    if (!host || (ownHost && host === ownHost.replace(/^www\./, "").toLowerCase())) return null;
    return host;
  } catch {
    return null;
  }
}

export type Utm = { source: string | null; medium: string | null; campaign: string | null };

export function parseUtm(search: string | null | undefined): Utm {
  const params = new URLSearchParams(search ?? "");
  const clean = (v: string | null) => (v ? v.trim().slice(0, 120) || null : null);
  return {
    source: clean(params.get("utm_source")),
    medium: clean(params.get("utm_medium")),
    campaign: clean(params.get("utm_campaign")),
  };
}

const SOURCE_RULES: [RegExp, string][] = [
  [/google\./, "Google"],
  [/bing\.|duckduckgo|yahoo\./, "Other search"],
  [/instagram|^l\.instagram/, "Instagram"],
  [/facebook|fb\.com|^l\.facebook|^m\.facebook/, "Facebook"],
  [/whatsapp|wa\.me/, "WhatsApp"],
  [/linkedin|lnkd\.in/, "LinkedIn"],
  [/youtube|youtu\.be/, "YouTube"],
  [/t\.co$|twitter|x\.com/, "X / Twitter"],
];

/** Human source label: UTM source wins, then referrer, else Direct. */
export function trafficSource(referrer: string | null, utm: Utm): string {
  if (utm.source) {
    const s = utm.source.toLowerCase();
    for (const [re, name] of SOURCE_RULES) if (re.test(s)) return name;
    return utm.source;
  }
  if (!referrer) return "Direct";
  for (const [re, name] of SOURCE_RULES) if (re.test(referrer)) return name;
  return referrer;
}

/** Conversions counted on the website (subset of tracked events). */
export const CONVERSION_EVENTS = ["contact_submitted", "book_demo", "sign_up", "whatsapp_click"] as const;
export type ConversionEvent = (typeof CONVERSION_EVENTS)[number];
export const SITE_EVENT_LABELS: Record<string, string> = {
  contact_submitted: "Contact form sent",
  book_demo: "Book a demo",
  sign_up: "Sign up",
  whatsapp_click: "WhatsApp click",
  login_click: "Login click",
  cta_click: "Button click",
};

/** Paths counted as the public website (marketing pages). */
export function isMarketingPath(path: string): boolean {
  const p = path.split("?")[0].replace(/\/+$/, "") || "/";
  return (
    p === "/" ||
    /^\/(about|construction-intelligence|contact|cookies|interior-showcase|privacy|projects|real-estate-showcase|services|terms)(\/|$)/.test(p)
  );
}

export function clampSeconds(value: unknown, max = MAX_HEARTBEAT_SECONDS): number {
  const n = Math.floor(Number(value));
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.min(n, max);
}
