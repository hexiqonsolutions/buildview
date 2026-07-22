"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createSignedStorageUrl } from "@/lib/supabase/storage-server";
import { resolveStoragePath } from "@/lib/supabase/storage";
import { STORAGE_BUCKETS } from "@/lib/types";

/** Generate a signed URL for previewing or downloading a report PDF. */
export async function getReportSignedUrl(
  reportId: string
): Promise<{ url: string; fileName: string }> {
  const supabase = await createClient();

  const { data: report, error } = await supabase
    .from("reports")
    .select("storage_path, file_url, file_name")
    .eq("id", reportId)
    .is("deleted_at", null)
    .single();

  if (error || !report) {
    throw new Error("Report not found");
  }

  const path = resolveStoragePath(report.storage_path, report.file_url);

  if (!path) {
    // Fallback: direct URL (legacy public files)
    if (report.file_url?.startsWith("http")) {
      return { url: report.file_url, fileName: report.file_name };
    }
    throw new Error("Report file path not found");
  }

  const url = await createSignedStorageUrl(STORAGE_BUCKETS.REPORTS, path);
  return { url, fileName: report.file_name };
}
