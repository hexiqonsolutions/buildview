import { createClient } from "@/lib/supabase/server";
import { type StorageBucket } from "@/lib/types";
import { internalError } from "@/lib/errors/server";

/** Create a time-limited signed URL for private bucket access (server-side). */
export async function createSignedStorageUrl(
  bucket: StorageBucket,
  path: string,
  expiresInSeconds = 3600
): Promise<string> {
  const supabase = await createClient();

  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresInSeconds);

  if (error || !data?.signedUrl) {
    throw internalError("createSignedStorageUrl", error);
  }

  return data.signedUrl;
}
