import "server-only";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { PublicError } from "@/lib/errors/public";
import { internalError, logServerError } from "@/lib/errors/server";
import { PORTAL_DOCUMENT_MIME_TYPES } from "@/lib/portal/document-upload";
import { PROJECT_MEDIA_MAX_BYTES, PROJECT_MEDIA_MIME_TYPES } from "@/lib/project-media";
import {
  AVATAR_MIME_TYPES,
  MAX_AVATAR_SIZE,
  MAX_PROJECT_COVER_SIZE,
  PROJECT_COVER_MIME_TYPES,
} from "@/lib/supabase/storage";
import { MAX_DOCUMENT_FILE_SIZE } from "@/lib/validations/document";
import { MAX_ISSUE_IMAGE_SIZE } from "@/lib/validations/issue";
import { MAX_REPORT_FILE_SIZE } from "@/lib/validations/report";
import { MAX_TIMELINE_PHOTO_SIZE } from "@/lib/validations/timeline";
import { STORAGE_BUCKETS, type StorageBucket } from "@/lib/types";

export interface UploadRule {
  bucket: StorageBucket;
  maxBytes: number;
  mimeTypes: readonly string[];
}

export interface VerifiedUpload {
  size: number;
  mimeType: string;
}

const PHOTO_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/heic"];

export const UPLOAD_RULES = {
  report: { bucket: STORAGE_BUCKETS.REPORTS, maxBytes: MAX_REPORT_FILE_SIZE, mimeTypes: ["application/pdf"] },
  document: { bucket: STORAGE_BUCKETS.DOCUMENTS, maxBytes: MAX_DOCUMENT_FILE_SIZE, mimeTypes: PORTAL_DOCUMENT_MIME_TYPES },
  invoice: { bucket: STORAGE_BUCKETS.DOCUMENTS, maxBytes: MAX_DOCUMENT_FILE_SIZE, mimeTypes: ["application/pdf"] },
  issueImage: { bucket: STORAGE_BUCKETS.ISSUE_IMAGES, maxBytes: MAX_ISSUE_IMAGE_SIZE, mimeTypes: PHOTO_MIME_TYPES },
  timelinePhoto: { bucket: STORAGE_BUCKETS.TIMELINE_PHOTOS, maxBytes: MAX_TIMELINE_PHOTO_SIZE, mimeTypes: PHOTO_MIME_TYPES },
  projectVideo: {
    bucket: STORAGE_BUCKETS.PROJECT_MEDIA,
    maxBytes: PROJECT_MEDIA_MAX_BYTES.video,
    mimeTypes: PROJECT_MEDIA_MIME_TYPES.video,
  },
  projectPhoto: {
    bucket: STORAGE_BUCKETS.PROJECT_MEDIA,
    maxBytes: PROJECT_MEDIA_MAX_BYTES.photo,
    mimeTypes: PROJECT_MEDIA_MIME_TYPES.photo,
  },
  projectCover: { bucket: STORAGE_BUCKETS.PROJECT_COVERS, maxBytes: MAX_PROJECT_COVER_SIZE, mimeTypes: PROJECT_COVER_MIME_TYPES },
  avatar: { bucket: STORAGE_BUCKETS.AVATARS, maxBytes: MAX_AVATAR_SIZE, mimeTypes: AVATAR_MIME_TYPES },
} as const satisfies Record<string, UploadRule>;

/** Enough to cover every signature below, including `%PDF-` after leading junk. */
const HEAD_BYTES = 4096;

type Head = Uint8Array;

function bytesAt(head: Head, bytes: readonly number[], offset = 0): boolean {
  return head.length >= offset + bytes.length && bytes.every((byte, i) => head[offset + i] === byte);
}

function asciiAt(head: Head, text: string, offset = 0): boolean {
  return bytesAt(head, Array.from(text, (char) => char.charCodeAt(0)), offset);
}

function ftypBrand(head: Head): string | null {
  return asciiAt(head, "ftyp", 4) ? String.fromCharCode(...head.subarray(8, 12)) : null;
}

const HEIF_BRANDS = new Set(["heic", "heix", "hevc", "hevx", "heim", "heis", "hevm", "hevs", "mif1", "msf1"]);
const QUICKTIME_ATOMS = ["moov", "mdat", "wide", "free", "skip", "pnot"];

const isPdf = (head: Head) => {
  const window = head.subarray(0, 1024);
  for (let i = 0; i + 5 <= window.length; i++) if (asciiAt(window, "%PDF-", i)) return true;
  return false;
};
const isZip = (head: Head) => asciiAt(head, "PK\x03\x04") || asciiAt(head, "PK\x05\x06");
const isOle = (head: Head) => bytesAt(head, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);

/**
 * Magic-byte check per stored Content-Type. `null` means any content is
 * accepted as long as it is not executable (the object is served as a download).
 */
const CONTENT_SIGNATURES: Record<string, ((head: Head) => boolean) | null> = {
  "application/pdf": isPdf,
  "image/jpeg": (head) => bytesAt(head, [0xff, 0xd8, 0xff]),
  "image/png": (head) => bytesAt(head, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  "image/gif": (head) => asciiAt(head, "GIF87a") || asciiAt(head, "GIF89a"),
  "image/webp": (head) => asciiAt(head, "RIFF") && asciiAt(head, "WEBP", 8),
  "image/heic": (head) => HEIF_BRANDS.has(ftypBrand(head) ?? ""),
  "video/mp4": (head) => ftypBrand(head) !== null,
  "video/quicktime": (head) => ftypBrand(head) !== null || QUICKTIME_ATOMS.some((atom) => asciiAt(head, atom, 4)),
  "video/webm": (head) => bytesAt(head, [0x1a, 0x45, 0xdf, 0xa3]),
  "application/zip": isZip,
  "application/x-zip-compressed": isZip,
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": isZip,
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": isZip,
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": isZip,
  "application/msword": isOle,
  "application/vnd.ms-excel": isOle,
  "application/vnd.ms-powerpoint": isOle,
  "text/plain": (head) => !head.includes(0),
  "application/octet-stream": null,
};

const EXECUTABLE_SIGNATURES: readonly (readonly number[])[] = [
  [0x7f, 0x45, 0x4c, 0x46], // ELF
  [0xfe, 0xed, 0xfa, 0xce], // Mach-O
  [0xfe, 0xed, 0xfa, 0xcf],
  [0xce, 0xfa, 0xed, 0xfe],
  [0xcf, 0xfa, 0xed, 0xfe],
  [0xca, 0xfe, 0xba, 0xbe], // Mach-O universal / Java class
  [0x23, 0x21], // "#!" script
];

const MARKUP_START =
  /^\ufeff?\s*<(?:!doctype|html|head|body|script|svg|iframe|object|embed|meta|link|style|form|img|\?xml)[\s>/]/i;

/** Native executables, scripts, and HTML/SVG/XML documents a browser could run. */
function looksExecutable(head: Head): boolean {
  // "MZ" alone also starts some text files; PE/DOS headers contain NUL bytes.
  if (asciiAt(head, "MZ") && head.subarray(0, 64).includes(0)) return true;
  if (EXECUTABLE_SIGNATURES.some((signature) => bytesAt(head, signature))) return true;
  return MARKUP_START.test(new TextDecoder().decode(head.subarray(0, 512)));
}

type Bucket = ReturnType<ReturnType<typeof createServiceRoleClient>["storage"]["from"]>;

function normalizeMimeType(value: unknown): string {
  return typeof value === "string" ? value.split(";")[0].trim().toLowerCase() : "";
}

async function statObject(bucket: Bucket, path: string): Promise<VerifiedUpload | null> {
  const { data, error } = await bucket.info(path);
  if (!error && data) {
    return { size: Number(data.size ?? 0), mimeType: normalizeMimeType(data.contentType) };
  }

  const slash = path.lastIndexOf("/");
  const folder = slash === -1 ? "" : path.slice(0, slash);
  const name = path.slice(slash + 1);
  const { data: entries, error: listError } = await bucket.list(folder, { search: name, limit: 100 });
  if (listError) throw listError;

  const entry = entries?.find((item) => item.name === name);
  if (!entry) return null;
  const metadata = (entry.metadata ?? {}) as { size?: number; mimetype?: string };
  return { size: Number(metadata.size ?? 0), mimeType: normalizeMimeType(metadata.mimetype) };
}

async function readHead(bucket: Bucket, path: string): Promise<Head> {
  const { data, error } = await bucket.createSignedUrl(path, 60);
  if (error || !data?.signedUrl) throw error ?? new Error("Storage returned no signed URL");

  const response = await fetch(data.signedUrl, {
    headers: { Range: `bytes=0-${HEAD_BYTES - 1}` },
    cache: "no-store",
  });
  if (!response.ok || !response.body) {
    throw new Error(`Storage read failed with status ${response.status}`);
  }

  // Read only the first chunk(s) even if the server ignores the Range header.
  const reader = response.body.getReader();
  const head = new Uint8Array(HEAD_BYTES);
  let length = 0;
  while (length < HEAD_BYTES) {
    const { done, value } = await reader.read();
    if (done) break;
    const take = Math.min(value.length, HEAD_BYTES - length);
    head.set(value.subarray(0, take), length);
    length += take;
  }
  await reader.cancel().catch(() => undefined);
  return head.subarray(0, length);
}

async function findRejection(
  bucket: Bucket,
  rule: UploadRule,
  path: string,
  stored: VerifiedUpload
): Promise<{ reason: string; message: string } | null> {
  if (stored.size <= 0) {
    return { reason: "empty object", message: "The uploaded file is empty." };
  }
  if (stored.size > rule.maxBytes) {
    return {
      reason: `size ${stored.size} exceeds ${rule.maxBytes}`,
      message: `Files must be ${Math.round(rule.maxBytes / 1024 / 1024)} MB or smaller.`,
    };
  }
  const signature = CONTENT_SIGNATURES[stored.mimeType];
  if (!rule.mimeTypes.includes(stored.mimeType) || signature === undefined) {
    return { reason: `content type "${stored.mimeType}" not allowed`, message: "This file type isn't allowed." };
  }

  const head = await readHead(bucket, path);
  if (looksExecutable(head)) {
    return {
      reason: "executable or markup content",
      message: "This file can't be uploaded because it contains executable content.",
    };
  }
  if (signature && !signature(head)) {
    return {
      reason: `content does not match "${stored.mimeType}"`,
      message: "The file's contents don't match its file type. Please upload a valid file.",
    };
  }
  return null;
}

/**
 * Verifies an object the browser uploaded directly to Storage before the app
 * records it: real size and Content-Type come from Storage (not the client),
 * and the first bytes must match that type and must not be executable.
 * Rejected objects are deleted. Returns the verified size and type to store.
 */
export async function verifyStoredUpload(
  rule: UploadRule,
  path: string,
  scope: string
): Promise<VerifiedUpload> {
  const bucket = createServiceRoleClient().storage.from(rule.bucket);

  let rejection: Awaited<ReturnType<typeof findRejection>>;
  let stored: VerifiedUpload | null;
  try {
    stored = await statObject(bucket, path);
    rejection = stored ? await findRejection(bucket, rule, path, stored) : null;
  } catch (err) {
    throw internalError(scope, err, { bucket: rule.bucket, path });
  }

  if (!stored) {
    logServerError(scope, "Uploaded object not found", { bucket: rule.bucket, path });
    throw new PublicError("The uploaded file could not be found. Please upload it again.");
  }

  if (rejection) {
    logServerError(scope, `Rejected upload: ${rejection.reason}`, { bucket: rule.bucket, path, ...stored });
    const { error } = await bucket.remove([path]);
    if (error) logServerError(scope, error, { bucket: rule.bucket, path, cleanup: true });
    throw new PublicError(rejection.message);
  }

  return stored;
}

export async function verifyStoredUploads(
  rule: UploadRule,
  paths: readonly string[],
  scope: string
): Promise<VerifiedUpload[]> {
  return Promise.all(paths.map((path) => verifyStoredUpload(rule, path, scope)));
}

/** Object path from a `getPublicUrl` URL in this project's storage, or null. */
export function publicObjectPath(url: string, bucket: StorageBucket): string | null {
  try {
    const parsed = new URL(url);
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (supabaseUrl && parsed.host !== new URL(supabaseUrl).host) return null;
    const prefix = `/storage/v1/object/public/${bucket}/`;
    if (parsed.search || parsed.hash || !parsed.pathname.startsWith(prefix)) return null;
    return decodeURIComponent(parsed.pathname.slice(prefix.length));
  } catch {
    return null;
  }
}
