/**
 * Matterport URL parsing and embed utilities.
 * Supports common Matterport share URL formats.
 */

const MATTERPORT_SHOW_HOST = "my.matterport.com";

/** Pull the URL out of pasted iframe embed code and add a missing scheme. */
function unwrapMatterportInput(input: string): string {
  let value = input.trim();

  const srcMatch = value.match(/src\s*=\s*["']([^"']+)["']/i);
  if (srcMatch?.[1]) {
    value = srcMatch[1].trim();
  }

  value = value.replace(/&amp;/g, "&");

  if (/^(www\.|my\.|discover\.)?matterport\.com/i.test(value)) {
    value = `https://${value}`;
  }

  return value;
}

/** Extract the Matterport model ID from a share URL, embed URL, or iframe embed code. */
export function extractMatterportModelId(url: string): string | null {
  const trimmed = unwrapMatterportInput(url);
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

    const discoverMatch = parsed.pathname.match(/\/(?:discover\/)?space\/([a-zA-Z0-9]+)/);
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
    throw new Error("Enter a valid 360° tour share URL.");
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

/** Public snapshot image Matterport serves for the model (works for public/unlisted spaces). */
export function getMatterportThumbnailUrl(url: string): string | null {
  const modelId = extractMatterportModelId(url);
  if (!modelId) return null;
  return `https://${MATTERPORT_SHOW_HOST}/api/v1/player/models/${modelId}/thumb`;
}

/** Snapshot URL only if Matterport actually serves it; private or archived spaces return 404. */
export async function resolveMatterportThumbnailUrl(url: string): Promise<string | null> {
  const thumbUrl = getMatterportThumbnailUrl(url);
  if (!thumbUrl) return null;
  try {
    const res = await fetch(thumbUrl, { method: "HEAD", signal: AbortSignal.timeout(4000) });
    const type = res.headers.get("content-type") ?? "";
    return res.ok && type.startsWith("image/") ? thumbUrl : null;
  } catch {
    return null;
  }
}

/** Public share URL (opens in new tab). */
export function getMatterportShareUrl(url: string): string {
  const modelId = extractMatterportModelId(url);
  if (!modelId) return url;
  return `https://${MATTERPORT_SHOW_HOST}/show/?m=${modelId}`;
}
