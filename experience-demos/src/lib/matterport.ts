const MATTERPORT_SHOW_HOST = "my.matterport.com";

function unwrapMatterportInput(input: string): string {
  let value = input.trim();
  const srcMatch = value.match(/src\s*=\s*["']([^"']+)["']/i);
  if (srcMatch?.[1]) value = srcMatch[1].trim();
  value = value.replace(/&amp;/g, "&");
  if (/^(www\.|my\.|discover\.)?matterport\.com/i.test(value)) {
    value = `https://${value}`;
  }
  return value;
}

export function extractMatterportModelId(url: string): string | null {
  const trimmed = unwrapMatterportInput(url);
  if (!trimmed) return null;
  if (/^[a-zA-Z0-9]{8,20}$/.test(trimmed)) return trimmed;
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

export function isValidMatterportUrl(url: string): boolean {
  return extractMatterportModelId(url) !== null;
}

export function normalizeMatterportUrl(url: string): string {
  const modelId = extractMatterportModelId(url);
  if (!modelId) return url;
  return `https://${MATTERPORT_SHOW_HOST}/show/?m=${modelId}`;
}

export function getMatterportEmbedUrl(url: string): string {
  const modelId = extractMatterportModelId(url);
  if (!modelId) return url;
  return `https://${MATTERPORT_SHOW_HOST}/show/?m=${modelId}&play=1&qs=1&title=0&help=0`;
}

export function getMatterportThumbnailUrl(url: string): string | null {
  const modelId = extractMatterportModelId(url);
  if (!modelId) return null;
  return `https://${MATTERPORT_SHOW_HOST}/api/v1/player/models/${modelId}/thumb`;
}

export function matterportShowUrl(modelId: string): string {
  return `https://${MATTERPORT_SHOW_HOST}/show/?m=${modelId}`;
}
