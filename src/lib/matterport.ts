/**
 * Matterport URL parsing and embed utilities.
 * Supports common Matterport share URL formats.
 */

const MATTERPORT_SHOW_HOST = "my.matterport.com";

/** Extract the Matterport model ID from a share or embed URL. */
export function extractMatterportModelId(url: string): string | null {
  const trimmed = url.trim();
  if (!trimmed) return null;

  // Bare model ID (alphanumeric, typical length 10–15)
  if (/^[a-zA-Z0-9]{8,20}$/.test(trimmed)) {
    return trimmed;
  }

  try {
    const parsed = new URL(trimmed);

    if (
      !parsed.hostname.endsWith("matterport.com") &&
      parsed.hostname !== MATTERPORT_SHOW_HOST
    ) {
      return null;
    }

    const queryId = parsed.searchParams.get("m");
    if (queryId) return queryId;

    const modelsMatch = parsed.pathname.match(/\/models\/([a-zA-Z0-9]+)/);
    if (modelsMatch?.[1]) return modelsMatch[1];

    const discoverMatch = parsed.pathname.match(/\/discover\/space\/([a-zA-Z0-9]+)/);
    if (discoverMatch?.[1]) return discoverMatch[1];
  } catch {
    return null;
  }

  return null;
}

/** Returns true if the value is a valid Matterport URL or model ID. */
export function isValidMatterportUrl(url: string): boolean {
  return extractMatterportModelId(url) !== null;
}

/** Canonical share URL stored in the database. */
export function normalizeMatterportUrl(url: string): string {
  const modelId = extractMatterportModelId(url);
  if (!modelId) {
    throw new Error("Invalid Matterport URL. Use a link like https://my.matterport.com/show/?m=...");
  }
  return `https://${MATTERPORT_SHOW_HOST}/show/?m=${modelId}`;
}

/** Embed URL for iframe display with autoplay and quickstart. */
export function getMatterportEmbedUrl(url: string): string {
  const modelId = extractMatterportModelId(url);
  if (!modelId) {
    return url;
  }
  return `https://${MATTERPORT_SHOW_HOST}/show/?m=${modelId}&play=1&qs=1&title=0&help=0`;
}

/** Public share URL (opens in new tab). */
export function getMatterportShareUrl(url: string): string {
  const modelId = extractMatterportModelId(url);
  if (!modelId) return url;
  return `https://${MATTERPORT_SHOW_HOST}/show/?m=${modelId}`;
}
