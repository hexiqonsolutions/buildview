import "server-only";

import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { getStorageQuota, type StorageQuota } from "@/lib/supabase/plan";
import { requireStaffPermission } from "@/lib/auth/staff";
import { STORAGE_BUCKETS, type StorageBucket } from "@/lib/types";

export type AdminStorageCategoryId =
  | "documents"
  | "reports"
  | "photos"
  | "issue_images"
  | "project_media"
  | "project_covers"
  | "avatars"
  | "matterport";

export type AdminStorageCategory = {
  id: AdminStorageCategoryId;
  label: string;
  bytes: number;
  fileCount: number;
};

export type AdminStorageClientRow = {
  clientId: string;
  clientName: string;
  bytes: number;
  fileCount: number;
};

export type AdminStorageStats = {
  totalBytes: number;
  quota: StorageQuota;
  /** "storage" = real object sizes (migration 031); "database" = documents/reports only. */
  usageSource: "storage" | "database";
  categories: AdminStorageCategory[];
  clients: AdminStorageClientRow[];
};

export type AdminSitePhoto = {
  id: string;
  caption: string | null;
  storage_path: string | null;
  image_url: string;
  created_at: string;
  event_id: string;
  event_title: string;
  event_date: string;
  project_id: string;
  project_name: string;
  building?: string | null;
  floor?: string | null;
};

type StorageUsageRow = { bucket: string; folder: string; bytes: number; fileCount: number };

const BUCKET_CATEGORIES: { id: AdminStorageCategoryId; bucket: StorageBucket; label: string }[] = [
  { id: "documents", bucket: STORAGE_BUCKETS.DOCUMENTS, label: "Documents" },
  { id: "reports", bucket: STORAGE_BUCKETS.REPORTS, label: "Reports" },
  { id: "photos", bucket: STORAGE_BUCKETS.TIMELINE_PHOTOS, label: "Site Photos" },
  { id: "issue_images", bucket: STORAGE_BUCKETS.ISSUE_IMAGES, label: "Issue Images" },
  { id: "project_media", bucket: STORAGE_BUCKETS.PROJECT_MEDIA, label: "Project Media" },
  { id: "project_covers", bucket: STORAGE_BUCKETS.PROJECT_COVERS, label: "Project Covers" },
  { id: "avatars", bucket: STORAGE_BUCKETS.AVATARS, label: "Profile Photos" },
];

/** Every bucket except avatars stores files under "<project_id>/...". */
const PROJECT_BUCKETS = new Set<string>(
  BUCKET_CATEGORIES.filter((c) => c.bucket !== STORAGE_BUCKETS.AVATARS).map((c) => c.bucket)
);

/** Real object sizes from storage.objects, or null if migration 031 isn't applied. */
async function loadStorageUsage(): Promise<StorageUsageRow[] | null> {
  try {
    const { data, error } = await createServiceRoleClient().rpc("get_storage_usage");
    if (error || !data) return null;
    return data.map((row) => ({
      bucket: row.bucket_id,
      folder: row.folder,
      bytes: Number(row.bytes) || 0,
      fileCount: Number(row.file_count) || 0,
    }));
  } catch {
    return null;
  }
}

/** Fallback when real usage is unavailable: only documents and reports record file sizes. */
async function loadDatabaseUsage(
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<StorageUsageRow[]> {
  const [documentsRes, reportsRes, photosRes, issueImagesRes] = await Promise.all([
    supabase.from("documents").select("file_size, project_id").is("deleted_at", null),
    supabase.from("reports").select("file_size, project_id").is("deleted_at", null),
    supabase.from("timeline_photos").select("id").is("deleted_at", null),
    supabase.from("issue_images").select("id").is("deleted_at", null),
  ]);

  const rows: StorageUsageRow[] = [];
  for (const [bucket, res] of [
    [STORAGE_BUCKETS.DOCUMENTS, documentsRes],
    [STORAGE_BUCKETS.REPORTS, reportsRes],
  ] as const) {
    for (const row of res.data ?? []) {
      rows.push({ bucket, folder: row.project_id, bytes: row.file_size ?? 0, fileCount: 1 });
    }
  }
  rows.push(
    { bucket: STORAGE_BUCKETS.TIMELINE_PHOTOS, folder: "", bytes: 0, fileCount: photosRes.data?.length ?? 0 },
    { bucket: STORAGE_BUCKETS.ISSUE_IMAGES, folder: "", bytes: 0, fileCount: issueImagesRes.data?.length ?? 0 }
  );
  return rows;
}

/** Used bytes and plan quota without the breakdown. Callers must check staff permissions. */
export async function getStorageTotals(): Promise<{ totalBytes: number; quota: StorageQuota }> {
  const [storageUsage, quota] = await Promise.all([loadStorageUsage(), getStorageQuota()]);
  const usage = storageUsage ?? (await loadDatabaseUsage(await createClient()));
  return { totalBytes: usage.reduce((sum, row) => sum + row.bytes, 0), quota };
}

export async function getAdminStorageStats(): Promise<AdminStorageStats> {
  await requireStaffPermission("read", "storage");
  const supabase = await createClient();

  const [storageUsage, quota, toursRes, projectsRes, clientsRes] = await Promise.all([
    loadStorageUsage(),
    getStorageQuota(),
    supabase.from("project_tours").select("id").is("deleted_at", null),
    // Deleted projects and clients still occupy storage until their files are removed.
    supabase.from("projects").select("id, client_id"),
    supabase.from("clients").select("id, name, company_name"),
  ]);

  const usageSource = storageUsage ? "storage" : "database";
  const usage = storageUsage ?? (await loadDatabaseUsage(supabase));

  const projectClientMap = new Map<string, string>();
  projectsRes.data?.forEach((p) => {
    if (p.client_id) projectClientMap.set(p.id, p.client_id);
  });

  const clientNameMap = new Map<string, string>();
  clientsRes.data?.forEach((c) => {
    clientNameMap.set(c.id, c.company_name || c.name);
  });

  const bucketTotals = new Map<string, { bytes: number; fileCount: number }>();
  const clientUsage = new Map<string, { bytes: number; fileCount: number }>();
  let totalBytes = 0;

  for (const row of usage) {
    totalBytes += row.bytes;

    const bucketTotal = bucketTotals.get(row.bucket) ?? { bytes: 0, fileCount: 0 };
    bucketTotal.bytes += row.bytes;
    bucketTotal.fileCount += row.fileCount;
    bucketTotals.set(row.bucket, bucketTotal);

    const clientId = PROJECT_BUCKETS.has(row.bucket) ? projectClientMap.get(row.folder) : undefined;
    if (clientId) {
      const current = clientUsage.get(clientId) ?? { bytes: 0, fileCount: 0 };
      current.bytes += row.bytes;
      current.fileCount += row.fileCount;
      clientUsage.set(clientId, current);
    }
  }

  const categories: AdminStorageCategory[] = [
    ...BUCKET_CATEGORIES.map(({ id, bucket, label }) => ({
      id,
      label,
      bytes: bucketTotals.get(bucket)?.bytes ?? 0,
      fileCount: bucketTotals.get(bucket)?.fileCount ?? 0,
    })),
    // Matterport hosts the tours; BuildView only stores links.
    { id: "matterport", label: "Virtual Tours", bytes: 0, fileCount: toursRes.data?.length ?? 0 },
  ];

  const clients: AdminStorageClientRow[] = Array.from(clientUsage.entries())
    .map(([clientId, clientTotal]) => ({
      clientId,
      clientName: clientNameMap.get(clientId) ?? "Unknown client",
      bytes: clientTotal.bytes,
      fileCount: clientTotal.fileCount,
    }))
    .sort((a, b) => b.bytes - a.bytes);

  return { totalBytes, quota, usageSource, categories, clients };
}

export async function getAdminSitePhotos(): Promise<AdminSitePhoto[]> {
  await requireStaffPermission("read", "projects");
  const supabase = await createClient();

  const { data } = await supabase
    .from("timeline_photos")
    .select(
      `
      id,
      caption,
      storage_path,
      image_url,
      created_at,
      timeline_event:timeline_events(
        id,
        title,
        event_date,
        project_id,
        building,
        floor,
        project:projects(name)
      )
    `
    )
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(200);

  if (!data) return [];

  const photos: AdminSitePhoto[] = [];

  for (const row of data) {
    const event = row.timeline_event as {
      id: string;
      title: string;
      event_date: string;
      project_id: string;
      building: string | null;
      floor: string | null;
      project: { name: string } | null;
    } | null;

    if (!event) continue;

    photos.push({
      id: row.id,
      caption: row.caption,
      storage_path: row.storage_path,
      image_url: row.image_url,
      created_at: row.created_at,
      event_id: event.id,
      event_title: event.title,
      event_date: event.event_date,
      project_id: event.project_id,
      project_name: event.project?.name ?? "Project",
      building: event.building,
      floor: event.floor,
    });
  }

  return photos;
}
