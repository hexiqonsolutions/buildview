"use server";

import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { createSignedStorageUrl } from "@/lib/supabase/storage-server";
import { resolveStoragePath } from "@/lib/supabase/storage";
import { STORAGE_BUCKETS } from "@/lib/types";

/** Generate a signed URL for previewing or downloading a report PDF. */
export async function getReportSignedUrl(
  reportId: string
): Promise<{ url: string; fileName: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("You must be signed in");

  // RLS on reports enforces project access for the current user.
  const { data: report, error } = await supabase
    .from("reports")
    .select("storage_path, file_url, file_name")
    .eq("id", reportId)
    .is("deleted_at", null)
    .single();

  if (error || !report) {
    throw new Error("Report not found or you do not have access");
  }

  const path = resolveStoragePath(report.storage_path, report.file_url);

  if (!path) {
    if (report.file_url?.startsWith("http")) {
      return { url: report.file_url, fileName: report.file_name };
    }
    throw new Error("Report file path not found");
  }

  try {
    const url = await createSignedStorageUrl(STORAGE_BUCKETS.REPORTS, path);
    return { url, fileName: report.file_name };
  } catch {
    // Storage RLS can be stricter than table RLS; service role after access check.
    const admin = createServiceRoleClient();
    const { data, error: signError } = await admin.storage
      .from(STORAGE_BUCKETS.REPORTS)
      .createSignedUrl(path, 3600);

    if (signError || !data?.signedUrl) {
      throw new Error(signError?.message ?? "Failed to generate download URL");
    }

    return { url: data.signedUrl, fileName: report.file_name };
  }
}
