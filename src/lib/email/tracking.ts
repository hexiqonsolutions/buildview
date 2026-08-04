import { createHash, randomUUID } from "crypto";

const PIXEL_GIF = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
  "base64"
);

export function getTrackingPixelBuffer() {
  return PIXEL_GIF;
}

export function createTrackingToken() {
  return randomUUID().replace(/-/g, "");
}

export function getAppBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    "http://localhost:3000"
  );
}

/** Inject invisible open-tracking pixel into outbound HTML only (not stored display copy). */
export function injectTrackingPixel(html: string, trackingToken: string) {
  const src = `${getAppBaseUrl()}/api/email/t/${trackingToken}.gif`;
  const pixel = `<img src="${src}" width="1" height="1" alt="" style="display:none;width:1px;height:1px;border:0;" />`;

  if (/<\/body>/i.test(html)) {
    return html.replace(/<\/body>/i, `${pixel}</body>`);
  }
  return `${html}${pixel}`;
}

export function hashIp(ip: string | null) {
  if (!ip) return null;
  return createHash("sha256").update(ip).digest("hex").slice(0, 32);
}
