import { addIssueImages } from "@/lib/actions/issues";
import { uploadIssueImageFile } from "@/lib/supabase/storage";

/** Uploads photos into the issue's storage folder, then records them after any existing photos. */
export async function attachIssueImages(projectId: string, issueId: string, files: File[]) {
  if (files.length === 0) return;
  const uploads = await Promise.all(
    files.map((file) => uploadIssueImageFile(projectId, issueId, file))
  );
  await addIssueImages(
    issueId,
    uploads.map((upload) => ({ storage_path: upload.path, file_name: upload.fileName }))
  );
}
