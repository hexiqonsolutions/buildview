import { randomUUID } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";

export const DOCUMENTS_BUCKET =
  process.env.DOCUMENTS_BUCKET?.trim() || "documents";

function sanitizeFileName(name: string) {
  return name.replace(/[^\w.\-()+ ]+/g, "_").slice(0, 120);
}

export async function ensureDocumentsBucket() {
  const supabase = createAdminClient();
  const { data: buckets, error: listError } =
    await supabase.storage.listBuckets();
  if (listError) throw new Error(listError.message);

  const exists = buckets?.some((bucket) => bucket.name === DOCUMENTS_BUCKET);
  if (exists) return;

  const { error } = await supabase.storage.createBucket(DOCUMENTS_BUCKET, {
    public: false,
    fileSizeLimit: 25 * 1024 * 1024,
  });
  if (error && !/already exists/i.test(error.message)) {
    throw new Error(error.message);
  }
}

export async function uploadDocumentFile(options: {
  organizationId: string;
  fileName: string;
  mimeType: string;
  bytes: Buffer;
}) {
  await ensureDocumentsBucket();
  const supabase = createAdminClient();
  const safeName = sanitizeFileName(options.fileName);
  const storagePath = `${options.organizationId}/${randomUUID()}-${safeName}`;

  const { error } = await supabase.storage
    .from(DOCUMENTS_BUCKET)
    .upload(storagePath, options.bytes, {
      contentType: options.mimeType,
      upsert: false,
    });

  if (error) throw new Error(error.message);
  return storagePath;
}

export async function removeDocumentFile(storagePath: string) {
  const supabase = createAdminClient();
  const { error } = await supabase.storage
    .from(DOCUMENTS_BUCKET)
    .remove([storagePath]);
  if (error) throw new Error(error.message);
}

export async function createDocumentSignedUrl(
  storagePath: string,
  expiresInSeconds = 60
) {
  const supabase = createAdminClient();
  const { data, error } = await supabase.storage
    .from(DOCUMENTS_BUCKET)
    .createSignedUrl(storagePath, expiresInSeconds);
  if (error || !data?.signedUrl) {
    throw new Error(error?.message || "Could not create download link");
  }
  return data.signedUrl;
}

export async function downloadDocumentBytes(storagePath: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase.storage
    .from(DOCUMENTS_BUCKET)
    .download(storagePath);
  if (error || !data) {
    throw new Error(error?.message || "Could not download file");
  }
  const buffer = Buffer.from(await data.arrayBuffer());
  return buffer;
}
